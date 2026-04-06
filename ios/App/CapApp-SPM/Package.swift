// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.0"),
        .package(name: "CapacitorCommunitySqlite", path: "../../../node_modules/.pnpm/@capacitor-community+sqlite@8.1.0_@capacitor+core@8.3.0/node_modules/@capacitor-community/sqlite"),
        .package(name: "CapacitorApp", path: "../../../node_modules/.pnpm/@capacitor+app@8.1.0_@capacitor+core@8.3.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorFilesystem", path: "../../../node_modules/.pnpm/@capacitor+filesystem@8.1.2_@capacitor+core@8.3.0/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorHaptics", path: "../../../node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.3.0/node_modules/@capacitor/haptics"),
        .package(name: "CapacitorLocalNotifications", path: "../../../node_modules/.pnpm/@capacitor+local-notifications@8.0.2_@capacitor+core@8.3.0/node_modules/@capacitor/local-notifications"),
        .package(name: "CapacitorPreferences", path: "../../../node_modules/.pnpm/@capacitor+preferences@8.0.1_@capacitor+core@8.3.0/node_modules/@capacitor/preferences"),
        .package(name: "CapacitorShare", path: "../../../node_modules/.pnpm/@capacitor+share@8.0.1_@capacitor+core@8.3.0/node_modules/@capacitor/share"),
        .package(name: "CapacitorToast", path: "../../../node_modules/.pnpm/@capacitor+toast@8.0.1_@capacitor+core@8.3.0/node_modules/@capacitor/toast"),
        .package(name: "CapacitorNativeSettings", path: "../../../node_modules/.pnpm/capacitor-native-settings@8.1.0_@capacitor+core@8.3.0/node_modules/capacitor-native-settings")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunitySqlite", package: "CapacitorCommunitySqlite"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorToast", package: "CapacitorToast"),
                .product(name: "CapacitorNativeSettings", package: "CapacitorNativeSettings")
            ]
        )
    ]
)
