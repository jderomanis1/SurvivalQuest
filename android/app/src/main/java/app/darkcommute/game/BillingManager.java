package app.darkcommute.game;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

final class BillingManager implements PurchasesUpdatedListener {
    interface Listener {
        void onBillingStateChanged(boolean premium, String formattedPrice, String status);
    }

    private static final String PREFS = "dark_commute_entitlement";
    private static final String KEY_PREMIUM = "premium_verified";
    private static final String KEY_VERIFIED_AT = "premium_verified_at";
    private static final long OFFLINE_GRACE_MS = 7L * 24L * 60L * 60L * 1000L;

    private final Context context;
    private final Listener listener;
    private final SharedPreferences preferences;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final BillingClient billingClient;

    private ProductDetails productDetails;
    private ProductDetails.OneTimePurchaseOfferDetails selectedOffer;
    private String formattedPrice = "CHECK PLAY STORE";
    private boolean connecting;

    BillingManager(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        this.preferences = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        PendingPurchasesParams pendingParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .build();
        this.billingClient = BillingClient.newBuilder(this.context)
            .setListener(this)
            .enablePendingPurchases(pendingParams)
            .enableAutoServiceReconnection()
            .build();
    }

    boolean isPremium() {
        if (!preferences.getBoolean(KEY_PREMIUM, false)) return false;
        long verifiedAt = preferences.getLong(KEY_VERIFIED_AT, 0L);
        return isVerificationFresh(System.currentTimeMillis(), verifiedAt);
    }

    String getFormattedPrice() {
        return formattedPrice;
    }

    static boolean isVerificationFresh(long now, long verifiedAt) {
        return verifiedAt > 0 && now >= verifiedAt && now - verifiedAt <= OFFLINE_GRACE_MS;
    }

    void connectAndRestore() {
        if (billingClient.isReady()) {
            queryProductDetails();
            queryOwnedPurchases();
            return;
        }
        if (connecting) return;
        connecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                connecting = false;
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    queryProductDetails();
                    queryOwnedPurchases();
                } else {
                    notifyState("PLAY BILLING UNAVAILABLE");
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
                notifyState("PLAY BILLING DISCONNECTED");
            }
        });
    }

    void launchPurchase(Activity activity) {
        if (!billingClient.isReady()) {
            connectAndRestore();
            notifyState("CONNECTING TO PLAY STORE");
            return;
        }
        if (isPremium()) {
            notifyState("FULL GAME ALREADY OWNED");
            return;
        }
        if (productDetails == null) {
            queryProductDetails();
            notifyState("PRODUCT DETAILS NOT READY");
            return;
        }

        BillingFlowParams.ProductDetailsParams.Builder productBuilder =
            BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(productDetails);
        if (selectedOffer != null) {
            String offerToken = selectedOffer.getOfferToken();
            if (offerToken != null && !offerToken.isBlank()) productBuilder.setOfferToken(offerToken);
        }
        BillingFlowParams params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(productBuilder.build()))
            .build();
        BillingResult result = billingClient.launchBillingFlow(activity, params);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            notifyState("PURCHASE COULD NOT START");
        }
    }

    private void queryProductDetails() {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(BuildConfig.PREMIUM_PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, this::handleProductDetailsResult);
    }

    private void handleProductDetailsResult(BillingResult result, QueryProductDetailsResult detailsResult) {
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            notifyState("FULL GAME PRODUCT UNAVAILABLE");
            return;
        }
        List<ProductDetails> details = detailsResult.getProductDetailsList();
        if (details.isEmpty()) {
            notifyState("CREATE PRODUCT dark_commute_full_game IN PLAY CONSOLE");
            return;
        }
        productDetails = details.get(0);
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = productDetails.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) selectedOffer = offers.get(0);
        else selectedOffer = productDetails.getOneTimePurchaseOfferDetails();
        if (selectedOffer != null) formattedPrice = selectedOffer.getFormattedPrice();
        notifyState(isPremium() ? "FULL GAME VERIFIED" : "FULL GAME AVAILABLE");
    }

    private void queryOwnedPurchases() {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                notifyState("RESTORE PURCHASES UNAVAILABLE");
                return;
            }
            Purchase owned = purchases.stream()
                .filter(this::containsPremiumProduct)
                .findFirst()
                .orElse(null);
            if (owned == null) {
                if (!isPremium()) clearEntitlement();
                notifyState(isPremium() ? "OFFLINE ENTITLEMENT ACTIVE" : "PROLOGUE MODE");
                return;
            }
            processPurchase(owned);
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) processPurchase(purchase);
        } else if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            notifyState("PURCHASE CANCELED");
        } else {
            notifyState("PURCHASE UPDATE FAILED");
        }
    }

    private boolean containsPremiumProduct(Purchase purchase) {
        return purchase.getProducts().contains(BuildConfig.PREMIUM_PRODUCT_ID);
    }

    private void processPurchase(Purchase purchase) {
        if (!containsPremiumProduct(purchase)) return;
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            notifyState("PURCHASE PENDING");
            return;
        }
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            clearEntitlement();
            notifyState("PURCHASE NOT COMPLETED");
            return;
        }
        notifyState("VERIFYING PURCHASE");
        networkExecutor.execute(() -> verifyWithServer(purchase));
    }

    private void verifyWithServer(Purchase purchase) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(BuildConfig.PURCHASE_VERIFY_URL);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setDoOutput(true);

            JSONObject body = new JSONObject();
            body.put("purchaseToken", purchase.getPurchaseToken());
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                ? connection.getInputStream()
                : connection.getErrorStream();
            String response;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                response = reader.lines().collect(Collectors.joining("\n"));
            }
            JSONObject result = new JSONObject(response);
            boolean verified = status == 200 && result.optBoolean("verified", false);
            if (!verified) {
                clearEntitlement();
                notifyState("PURCHASE VERIFICATION FAILED");
                return;
            }

            preferences.edit()
                .putBoolean(KEY_PREMIUM, true)
                .putLong(KEY_VERIFIED_AT, System.currentTimeMillis())
                .apply();

            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
                mainHandler.post(() -> billingClient.acknowledgePurchase(params, acknowledgeResult ->
                    notifyState(acknowledgeResult.getResponseCode() == BillingClient.BillingResponseCode.OK
                        ? "FULL GAME VERIFIED"
                        : "VERIFIED · ACKNOWLEDGEMENT RETRY PENDING")));
            } else {
                notifyState("FULL GAME VERIFIED");
            }
        } catch (Exception exception) {
            notifyState(isPremium() ? "OFFLINE ENTITLEMENT ACTIVE" : "VERIFICATION SERVICE UNAVAILABLE");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void clearEntitlement() {
        preferences.edit().remove(KEY_PREMIUM).remove(KEY_VERIFIED_AT).apply();
    }

    private void notifyState(String status) {
        mainHandler.post(() -> listener.onBillingStateChanged(isPremium(), formattedPrice, status));
    }

    void destroy() {
        networkExecutor.shutdownNow();
        if (billingClient.isReady()) billingClient.endConnection();
    }
}
