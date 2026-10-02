package com.aviatorsregiment.app;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

/** Opens the website full screen in a Trusted Web Activity. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 8.0 throws when a translucent activity requests a fixed orientation.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
