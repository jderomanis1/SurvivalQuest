# Keep JavaScript interface methods exposed to the bundled game.
-keepclassmembers class app.darkcommute.game.MainActivity$NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Play Billing uses annotations and generic signatures in public APIs.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
