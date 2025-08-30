package com.paxeer.wallet;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import android.util.Log;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "PaxeerWallet";
    
    @Override
    public void onStart() {
        super.onStart();
        setupWeb3Provider();
    }
    
    private void setupWeb3Provider() {
        // Get the WebView from Capacitor
        WebView webView = getBridge().getWebView();
        
        // Enable JavaScript debugging
        WebView.setWebContentsDebuggingEnabled(true);
        
        // Configure WebView settings for mobile APK
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        webView.getSettings().setAllowFileAccessFromFileURLs(true);
        
        // Add JavaScript interface for Web3 communication
        webView.addJavascriptInterface(new Web3Bridge(), "Android");
        
        // Inject Web3 provider script and mobile detection
        webView.evaluateJavascript(
            "window.isMobileApp = true;" +
            "window.Capacitor = true;" +
            "if (!window.ethereum) {" +
            "  var script = document.createElement('script');" +
            "  script.src = './web3-provider.js';" +
            "  document.head.appendChild(script);" +
            "}", null
        );
        
        Log.d(TAG, "Web3 provider and mobile configuration completed");
    }
    
    public class Web3Bridge {
        @JavascriptInterface
        public void handleWeb3Request(String requestJson) {
            Log.d(TAG, "Web3 request received: " + requestJson);
            
            try {
                JSONObject request = new JSONObject(requestJson);
                String action = request.getString("action");
                int id = request.getInt("id");
                
                // Handle different Web3 actions
                switch (action) {
                    case "getAccounts":
                        handleGetAccounts(id);
                        break;
                    case "sendTransaction":
                        handleSendTransaction(id, request.getJSONObject("data"));
                        break;
                    case "personalSign":
                        handlePersonalSign(id, request.getJSONObject("data"));
                        break;
                    case "rpcCall":
                        handleRpcCall(id, request.getJSONObject("data"));
                        break;
                    default:
                        sendErrorResponse(id, "Unsupported action: " + action);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error handling Web3 request", e);
            }
        }
        
        private void handleGetAccounts(int id) {
            // Return the active account from your wallet
            // This should integrate with your existing wallet logic
            String activeAccount = "0x1339150a8aFA1CEf64831e83002699E549e2816C"; // From your wallet
            sendSuccessResponse(id, "[\"" + activeAccount + "\"]");
        }
        
        private void handleSendTransaction(int id, JSONObject data) {
            // Show native transaction confirmation dialog
            // This should integrate with your existing transaction logic
            Log.d(TAG, "Transaction request: " + data.toString());
            
            // For now, return a mock transaction hash
            sendSuccessResponse(id, "\"0x1234567890abcdef\"");
        }
        
        private void handlePersonalSign(int id, JSONObject data) {
            // Show native signing dialog
            // This should integrate with your existing signing logic
            Log.d(TAG, "Sign request: " + data.toString());
            
            // For now, return a mock signature
            sendSuccessResponse(id, "\"0xsignature123\"");
        }
        
        private void handleRpcCall(int id, JSONObject data) {
            // Forward RPC calls to your blockchain provider
            // This should use your existing API infrastructure
            Log.d(TAG, "RPC call: " + data.toString());
            
            // For now, return a mock response
            sendSuccessResponse(id, "\"0x0\"");
        }
        
        private void sendSuccessResponse(int id, String result) {
            String response = "{\"id\":" + id + ",\"success\":true,\"result\":" + result + "}";
            sendResponseToWebView(response);
        }
        
        private void sendErrorResponse(int id, String error) {
            String response = "{\"id\":" + id + ",\"success\":false,\"error\":\"" + error + "\"}";
            sendResponseToWebView(response);
        }
        
        private void sendResponseToWebView(String response) {
            runOnUiThread(() -> {
                WebView webView = getBridge().getWebView();
                webView.evaluateJavascript("window.paxeerHandleResponse('" + response + "')", null);
            });
        }
    }
}
