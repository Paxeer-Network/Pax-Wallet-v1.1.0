#!/bin/bash

# Navigate to android project
cd /root/PaxLaunch-Protocol/Paxeer-Wallet/android
print_info "Building Paxeer Wallet APK..."

# Set JAVA_HOME to Java 21
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Make gradlew executable
chmod +x ./gradlew

# Clean and build the project
print_info "Cleaning previous builds..."
./gradlew clean

print_info "Building debug APK..."
./gradlew assembleDebug

# Check if APK was built successfully
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    print_status "🎉 APK BUILT SUCCESSFULLY!"
    echo ""
    echo "📱 PAXEER WALLET APK DETAILS:"
    echo "================================="
    echo "📁 Location: $(pwd)/$APK_PATH"
    echo "📏 Size: $(du -h $APK_PATH | cut -f1)"
    echo "🏷️  Name: Paxeer Wallet"
    echo "📦 Package: com.paxeer.wallet"
    echo "🎯 Features: Web3 + dApp Browser + Options Trading"
    echo ""
    
    # Copy APK to home directory for easy access
    cp "$APK_PATH" ~/paxeer-wallet.apk
    print_status "APK copied to ~/paxeer-wallet.apk for easy download"
    
    echo ""
    print_info "🚀 INSTALLATION INSTRUCTIONS:"
    echo "1. Download the APK file: ~/paxeer-wallet.apk"
    echo "2. Transfer to your Android device"
    echo "3. Enable 'Unknown Sources' in Android settings"
    echo "4. Install the APK"
    echo "5. Enjoy your WPAX-branded crypto wallet!"
    echo ""
    print_status "BUILD COMPLETE! Your Paxeer Wallet Android app is ready! 🎉"
    
else
    print_error "APK build failed. Check the logs above for errors."
    exit 1
fi