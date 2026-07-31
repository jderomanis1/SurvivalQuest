package app.darkcommute.game;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONException;
import org.json.JSONObject;

public final class MainActivity extends AppCompatActivity implements BillingManager.Listener {
    private static final String LOCAL_ORIGIN = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + LOCAL_ORIGIN + "/assets/www/index.html";

    private WebView webView;
    private LinearLayout loadingPanel;
    private LinearLayout errorPanel;
    private TextView errorMessage;
    private BillingManager billingManager;
    private WebViewAssetLoader assetLoader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(5, 6, 7));
        getWindow().setNavigationBarColor(Color.rgb(5, 6, 7));
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.gameWebView);
        loadingPanel = findViewById(R.id.loadingPanel);
        errorPanel = findViewById(R.id.errorPanel);
        errorMessage = findViewById(R.id.errorMessage);
        Button reloadButton = findViewById(R.id.reloadButton);
        reloadButton.setOnClickListener(view -> recreate());

        assetLoader = new WebViewAssetLoader.Builder()
            .setDomain(LOCAL_ORIGIN)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        billingManager = new BillingManager(this, this);
        configureWebView();
        configureBackNavigation();

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(START_URL);
        } else {
            loadingPanel.setVisibility(View.GONE);
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " DarkCommuteAndroid/" + BuildConfig.VERSION_NAME);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        webView.setBackgroundColor(Color.rgb(5, 6, 7));
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new NativeBridge(), "DarkCommuteNative");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (LOCAL_ORIGIN.equals(uri.getHost())) return false;
                String scheme = uri.getScheme();
                if ("https".equals(scheme) || "http".equals(scheme)) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loadingPanel.setVisibility(View.GONE);
                errorPanel.setVisibility(View.GONE);
                billingManager.connectAndRestore();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                ViewGroup parent = (ViewGroup) view.getParent();
                parent.removeView(view);
                view.destroy();
                showRendererError(detail.didCrash()
                    ? "The Android WebView renderer crashed. Your save remains on this device."
                    : "Android reclaimed the game renderer. Your save remains on this device.");
                return true;
            }
        });
    }

    private void configureBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private void showRendererError(String message) {
        loadingPanel.setVisibility(View.GONE);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        if (billingManager != null) billingManager.connectAndRestore();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (billingManager != null) billingManager.destroy();
        if (webView != null) {
            webView.removeJavascriptInterface("DarkCommuteNative");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBillingStateChanged(boolean premium, String formattedPrice, String status) {
        if (webView == null) return;
        try {
            JSONObject detail = new JSONObject();
            detail.put("premium", premium);
            detail.put("price", formattedPrice);
            detail.put("status", status);
            String script = "window.dispatchEvent(new CustomEvent('darkcommute:billing',{detail:" + detail + "}));";
            runOnUiThread(() -> webView.evaluateJavascript(script, null));
        } catch (JSONException ignored) {
            // All values are controlled locally, so JSON construction should not fail.
        }
    }

    private void haptic(String kind) {
        long[] pattern;
        if ("damage".equals(kind)) pattern = new long[]{0, 45, 35, 70};
        else if ("signal".equals(kind)) pattern = new long[]{0, 18, 45, 18, 45, 40};
        else pattern = new long[]{0, 14};

        Vibrator vibrator;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
            vibrator = manager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        }
        if (vibrator != null && vibrator.hasVibrator()) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
        }
    }

    private final class NativeBridge {
        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public boolean isPremium() {
            return billingManager.isPremium();
        }

        @JavascriptInterface
        public String getPremiumPrice() {
            return billingManager.getFormattedPrice();
        }

        @JavascriptInterface
        public String getVersion() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public void purchasePremium() {
            runOnUiThread(() -> billingManager.launchPurchase(MainActivity.this));
        }

        @JavascriptInterface
        public void restorePurchases() {
            billingManager.connectAndRestore();
        }

        @JavascriptInterface
        public void haptic(String kind) {
            MainActivity.this.haptic(kind);
        }
    }
}
