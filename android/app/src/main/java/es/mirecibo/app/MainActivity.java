package es.mirecibo.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String UI_CACHE_VERSION = "0.9.0";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdatePlugin.class);
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                String script = "(function(){"
                    + "var key='mirecibo-native-ui-cache';var version='" + UI_CACHE_VERSION + "';"
                    + "if(localStorage.getItem(key)===version)return;localStorage.setItem(key,version);"
                    + "var tasks=[];"
                    + "if('serviceWorker' in navigator)tasks.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister();}));}));"
                    + "if('caches' in window)tasks.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k);}));}));"
                    + "Promise.all(tasks).then(function(){location.reload();});"
                    + "})();";
                webView.evaluateJavascript(script, null);
            }
        });
        super.onCreate(savedInstanceState);
    }
}
