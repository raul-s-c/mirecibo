package es.mirecibo.app;

import android.app.Activity;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "MiReciboAds")
public class AdMobPlugin extends Plugin {
    private ConsentInformation consentInformation;
    private AdView banner;
    private final AtomicBoolean adsInitialized = new AtomicBoolean(false);

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            consentInformation = UserMessagingPlatform.getConsentInformation(activity);
            ConsentRequestParameters parameters = new ConsentRequestParameters.Builder()
                .setTagForUnderAgeOfConsent(false)
                .build();
            consentInformation.requestConsentInfoUpdate(
                activity,
                parameters,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                    activity,
                    formError -> finishConsentRequest(call, formError == null ? null : formError.getMessage())
                ),
                requestError -> finishConsentRequest(call, requestError.getMessage())
            );
        });
    }

    private void finishConsentRequest(PluginCall call, String error) {
        boolean canRequestAds = consentInformation != null && consentInformation.canRequestAds();
        if (canRequestAds && adsInitialized.compareAndSet(false, true)) {
            MobileAds.initialize(getContext(), status -> {});
        }
        JSObject result = new JSObject();
        result.put("canRequestAds", canRequestAds);
        result.put("privacyOptionsRequired", privacyOptionsRequired());
        if (error != null) result.put("warning", error);
        call.resolve(result);
    }

    private boolean privacyOptionsRequired() {
        return consentInformation != null
            && consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (consentInformation == null || !consentInformation.canRequestAds()) {
                JSObject result = new JSObject();
                result.put("shown", false);
                call.resolve(result);
                return;
            }
            if (banner != null) {
                banner.setVisibility(AdView.VISIBLE);
                resolveBanner(call, banner.getAdSize());
                return;
            }

            DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
            ViewGroup content = activity.findViewById(android.R.id.content);
            int pixelWidth = content.getWidth() > 0 ? content.getWidth() : metrics.widthPixels;
            int widthDp = Math.max(320, (int) (pixelWidth / metrics.density));
            AdSize size = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp);
            AdView nextBanner = new AdView(activity);
            nextBanner.setAdUnitId(BuildConfig.ADMOB_BANNER_ID);
            nextBanner.setAdSize(size);
            nextBanner.setAdListener(new AdListener() {
                private boolean finished;

                @Override
                public void onAdLoaded() {
                    if (finished) return;
                    finished = true;
                    resolveBanner(call, size);
                }

                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    if (finished) return;
                    finished = true;
                    removeBanner();
                    JSObject result = new JSObject();
                    result.put("shown", false);
                    result.put("warning", error.getMessage());
                    call.resolve(result);
                }
            });
            FrameLayout.LayoutParams layout = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
            );
            activity.addContentView(nextBanner, layout);
            banner = nextBanner;
            nextBanner.loadAd(new AdRequest.Builder().build());
        });
    }

    private void resolveBanner(PluginCall call, AdSize size) {
        DisplayMetrics metrics = getActivity().getResources().getDisplayMetrics();
        JSObject result = new JSObject();
        result.put("shown", true);
        result.put("height", Math.max(50, Math.round(size.getHeightInPixels(getActivity()) / metrics.density)));
        call.resolve(result);
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (banner != null) banner.setVisibility(AdView.GONE);
            call.resolve();
        });
    }

    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!privacyOptionsRequired()) {
                JSObject result = new JSObject();
                result.put("shown", false);
                call.resolve(result);
                return;
            }
            UserMessagingPlatform.showPrivacyOptionsForm(getActivity(), error -> {
                if (error != null) call.reject(error.getMessage());
                else {
                    JSObject result = new JSObject();
                    result.put("shown", true);
                    call.resolve(result);
                }
            });
        });
    }

    private void removeBanner() {
        if (banner == null) return;
        ViewGroup parent = (ViewGroup) banner.getParent();
        if (parent != null) parent.removeView(banner);
        banner.destroy();
        banner = null;
    }

    @Override
    protected void handleOnDestroy() {
        Activity activity = getActivity();
        if (activity != null) activity.runOnUiThread(this::removeBanner);
        super.handleOnDestroy();
    }
}
