package es.mirecibo.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MiReciboUpdater")
public class UpdatePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void installApk(PluginCall call) {
        String source = call.getString("url", "");
        String requestedName = call.getString("fileName", "MiRecibo-update.apk");
        if (!source.startsWith("https://github.com/raul-s-c/mirecibo/releases/download/") || !requestedName.toLowerCase().endsWith(".apk")) {
            call.reject("Origen de actualización no permitido."); return;
        }
        executor.execute(() -> {
            try {
                File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (directory == null) throw new IllegalStateException("No hay almacenamiento disponible.");
                File apk = new File(directory, "MiRecibo-update.apk");
                HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
                connection.setConnectTimeout(20000); connection.setReadTimeout(120000); connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "MiRecibo-Android-Updater");
                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) throw new IllegalStateException("Descarga rechazada (" + status + ").");
                long length = connection.getContentLengthLong();
                if (length > 150L * 1024 * 1024) throw new IllegalStateException("La actualización es demasiado grande.");
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apk, false)) {
                    byte[] buffer = new byte[32768]; long total = 0; int read;
                    while ((read = input.read(buffer)) != -1) { total += read; if (total > 150L * 1024 * 1024) throw new IllegalStateException("La actualización es demasiado grande."); output.write(buffer, 0, read); }
                } finally { connection.disconnect(); }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
                    Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                    getActivity().runOnUiThread(() -> getActivity().startActivity(permission));
                    JSObject result = new JSObject(); result.put("permissionRequired", true); call.resolve(result); return;
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().runOnUiThread(() -> getActivity().startActivity(install));
                call.resolve(new JSObject());
            } catch (Exception error) { call.reject("No se pudo descargar la actualización: " + error.getMessage()); }
        });
    }

    @Override protected void handleOnDestroy() { executor.shutdownNow(); super.handleOnDestroy(); }
}
