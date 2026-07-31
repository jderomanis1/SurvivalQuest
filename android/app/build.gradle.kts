plugins {
    id("com.android.application")
}

android {
    namespace = "app.darkcommute.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.darkcommute.game"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "2.0.0"

        buildConfigField(
            "String",
            "PURCHASE_VERIFY_URL",
            "\"https://darkcommute.app/.netlify/functions/verify-purchase\""
        )
        buildConfigField("String", "PREMIUM_PRODUCT_ID", "\"dark_commute_full_game\"")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
        viewBinding = false
    }

    packaging {
        resources.excludes += setOf(
            "META-INF/AL2.0",
            "META-INF/LGPL2.1"
        )
    }
}

val syncWebAssets by tasks.registering(Copy::class) {
    val repositoryRoot = rootProject.projectDir.parentFile
    from(repositoryRoot) {
        include("index.html")
        include("styles.css")
        include("manifest.webmanifest")
        include("icon.svg")
        include("src/**")
    }
    into(layout.projectDirectory.dir("src/main/assets/www"))
}

tasks.named("preBuild").configure {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.activity:activity:1.13.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.webkit:webkit:1.16.0")
    implementation("com.android.billingclient:billing:9.1.0")

    testImplementation("junit:junit:4.13.2")
}
