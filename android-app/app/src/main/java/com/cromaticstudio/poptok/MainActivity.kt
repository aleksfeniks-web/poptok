package com.cromaticstudio.poptok

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // URL de producción de Poptok
    private val POPTOK_URL = "https://poptok-app.onrender.com"

    // Web Client ID para Google Sign-In (reemplazar con el real desde Firebase Console)
    // Una vez que tengas el google-services.json real, puedes usar getString(R.string.default_web_client_id)
    private val WEB_CLIENT_ID = "678268067561-rdap2es68a7uc59unm268pvvkiaq55nr.apps.googleusercontent.com"

    private lateinit var googleSignInClient: GoogleSignInClient

    private val permissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* Permisos solicitados */ }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        filePathCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else arrayOf())
        filePathCallback = null
    }

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            try {
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                val account: GoogleSignInAccount = task.getResult(ApiException::class.java)
                val idToken = account.idToken ?: ""
                val email = account.email ?: ""
                val displayName = account.displayName ?: ""
                val photoUrl = account.photoUrl?.toString() ?: ""
                // Inyectar credenciales en el WebView para que la web use Firebase con el token
                webView.evaluateJavascript("""
                    (function() {
                        window.__androidGoogleToken = '$idToken';
                        window.__androidGoogleEmail = '$email';
                        window.__androidGoogleName = '$displayName';
                        window.__androidGooglePhoto = '$photoUrl';
                        if (typeof window.__poptokAndroidGoogleCallback === 'function') {
                            window.__poptokAndroidGoogleCallback('$idToken', '$email', '$displayName', '$photoUrl');
                        }
                    })();
                """.trimIndent(), null)
            } catch (e: ApiException) {
                webView.evaluateJavascript("""
                    (function() {
                        if (typeof window.__poptokAndroidGoogleError === 'function') {
                            window.__poptokAndroidGoogleError('${e.statusCode}');
                        }
                    })();
                """.trimIndent(), null)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Ajustar WebView para que no se oculte tras las barras de estado o navegación del sistema
        WindowCompat.setDecorFitsSystemWindows(window, true)
        window.statusBarColor = Color.BLACK
        window.navigationBarColor = Color.BLACK

        // Google Sign-In setup
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(WEB_CLIENT_ID)
            .requestEmail()
            .requestProfile()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        val rootLayout = FrameLayout(this)
        rootLayout.setBackgroundColor(Color.BLACK)

        // Escuchar y aplicar insets del sistema (barras de estado y navegación) para evitar sobreposiciones
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                userAgentString = userAgentString + " PoptokAndroid/1.0"
            }

            // Bridge JavaScript → Android para Google Sign-In nativo
            addJavascriptInterface(object {
                @JavascriptInterface
                fun triggerGoogleSignIn() {
                    runOnUiThread {
                        googleSignInLauncher.launch(googleSignInClient.signInIntent)
                    }
                }

                @JavascriptInterface
                fun signOutGoogle() {
                    googleSignInClient.signOut()
                }

                @JavascriptInterface
                fun isAndroid(): Boolean = true
            }, "PoptokAndroid")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    view.evaluateJavascript("""
                        document.body.style.overscrollBehavior = 'none';
                        window.__isAndroidApp = true;
                    """.trimIndent(), null)
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    val toRequest = mutableListOf<String>()
                    request.resources.forEach { res ->
                        when (res) {
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                                if (!hasPermission(Manifest.permission.CAMERA)) toRequest += Manifest.permission.CAMERA
                            PermissionRequest.RESOURCE_AUDIO_CAPTURE ->
                                if (!hasPermission(Manifest.permission.RECORD_AUDIO)) toRequest += Manifest.permission.RECORD_AUDIO
                        }
                    }
                    if (toRequest.isNotEmpty()) permissionsLauncher.launch(toRequest.toTypedArray())
                    request.grant(request.resources)
                }

                override fun onShowFileChooser(
                    webView: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams
                ): Boolean {
                    filePathCallback?.onReceiveValue(arrayOf())
                    filePathCallback = callback
                    val mime = params.acceptTypes.firstOrNull()?.takeIf { it.isNotEmpty() } ?: "video/*"
                    fileChooserLauncher.launch(mime)
                    return true
                }

                private var customView: View? = null
                private var customViewCallback: CustomViewCallback? = null

                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    customView = view
                    customViewCallback = callback
                    rootLayout.addView(view)
                    webView.visibility = View.GONE
                    window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                }

                override fun onHideCustomView() {
                    customView?.let { rootLayout.removeView(it) }
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    webView.visibility = View.VISIBLE
                    window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                }
            }

            loadUrl(POPTOK_URL)
        }

        rootLayout.addView(webView)
        setContentView(rootLayout)
        requestInitialPermissions()
    }

    private fun hasPermission(permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun requestInitialPermissions() {
        val needed = buildList {
            if (!hasPermission(Manifest.permission.CAMERA)) add(Manifest.permission.CAMERA)
            if (!hasPermission(Manifest.permission.RECORD_AUDIO)) add(Manifest.permission.RECORD_AUDIO)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (!hasPermission(Manifest.permission.READ_MEDIA_VIDEO)) add(Manifest.permission.READ_MEDIA_VIDEO)
                if (!hasPermission(Manifest.permission.READ_MEDIA_IMAGES)) add(Manifest.permission.READ_MEDIA_IMAGES)
                if (!hasPermission(Manifest.permission.POST_NOTIFICATIONS)) add(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                if (!hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)) add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
        if (needed.isNotEmpty()) permissionsLauncher.launch(needed.toTypedArray())
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onResume() { super.onResume(); webView.onResume() }
    override fun onPause() { super.onPause(); webView.onPause() }
    override fun onDestroy() { super.onDestroy(); webView.destroy() }
}
