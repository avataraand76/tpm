plugins {
    id("com.android.application")
}

android {
    // Giữ nguyên package của app cũ: máy đã cài sẽ được cập nhật đè (giữ cấu hình),
    // và assetlinks.json trên tpm.vietlonghung.com.vn đang khai báo đúng package này.
    namespace = "com.tina.rfidadapterapp"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tina.rfidadapterapp"
        minSdk = 26
        targetSdk = 34
        versionCode = 200
        versionName = "2.0.0"
        buildConfigField("String", "TWA_URL", "\"https://tpm.vietlonghung.com.vn/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation(files("libs/lcrrgxmodule-release-20260311.aar"))
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.browser:browser:1.8.0")
}
