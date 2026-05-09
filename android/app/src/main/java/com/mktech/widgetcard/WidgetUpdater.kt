package com.mktech.widgetcard

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetUpdater(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "WidgetUpdater"

    @ReactMethod
    fun reloadAll() {
        val context = reactApplicationContext
        update(context, ContactQRSmall::class.java)
        update(context, BankQRSmall::class.java)
        update(context, ContactMedium::class.java)
        update(context, BankMedium::class.java)
    }

    private fun update(context: android.content.Context, cls: Class<*>) {
        val intent = Intent(context, cls)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, cls))
        if (ids.isNotEmpty()) {
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
