package com.mktech.widgetcard

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.util.Log
import android.widget.RemoteViews
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.mktech.widgetcard.R
import org.json.JSONObject
import java.lang.Exception
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale
import java.util.concurrent.Executors

open class MKWidgetProvider : AppWidgetProvider() {
    companion object {
        private val widgetExecutor = Executors.newSingleThreadExecutor()
        private const val SMALL_QR_SIZE = 640
        private const val MEDIUM_QR_SIZE = 560

        private val bankAliases = mapOf(
            "MB BANK" to "MB",
            "MBBANK" to "MB",
            "VIETCOMBANK" to "VCB",
            "VIETINBANK" to "ICB",
            "TECHCOMBANK" to "TCB",
            "VPBANK" to "VPB",
            "TPBANK" to "TPB",
            "SACOMBANK" to "STB"
        )

        private val bankDisplayNames = mapOf(
            "MB" to "MB Bank",
            "VCB" to "Vietcombank",
            "ICB" to "VietinBank",
            "BIDV" to "BIDV",
            "TCB" to "Techcombank",
            "ACB" to "ACB",
            "VPB" to "VPBank",
            "VIB" to "VIB",
            "TPB" to "TPBank",
            "STB" to "Sacombank"
        )
    }

    private data class WidgetUserData(
        val fullName: String,
        val phone: String,
        val email: String,
        val title: String,
        val company: String,
        val countryCode: String,
        val bankCode: String,
        val bankAccount: String
    )

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val pendingResult = goAsync()
            val appContext = context.applicationContext
            val appWidgetManager = AppWidgetManager.getInstance(appContext)
            val appWidgetIds = intent
                .getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
                ?.takeUnless { it.isEmpty() }
                ?: appWidgetManager.getAppWidgetIds(ComponentName(appContext, this::class.java))

            widgetExecutor.execute {
                try {
                    updateWidgets(appContext, appWidgetManager, appWidgetIds)
                } finally {
                    pendingResult.finish()
                }
            }
            return
        }

        super.onReceive(context, intent)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val appContext = context.applicationContext
        widgetExecutor.execute {
            updateWidgets(appContext, appWidgetManager, appWidgetIds)
        }
    }

    private fun updateWidgets(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val widgetInfo = appWidgetManager.getAppWidgetInfo(appWidgetId)
        val providerName = widgetInfo?.provider?.className ?: ""
        val isMedium = providerName.contains("Medium")
        val isContactWidget = providerName.contains("Contact")

        val views = if (isMedium) {
            RemoteViews(context.packageName, R.layout.widget_medium)
        } else {
            RemoteViews(context.packageName, R.layout.widget_qr_small)
        }

        try {
            val user = readUserData(context)
            val qrSize = if (isMedium) MEDIUM_QR_SIZE else SMALL_QR_SIZE

            if (isContactWidget) {
                val hasContactInfo = user?.fullName?.isNotBlank() == true

                if (hasContactInfo) {
                    val contactUser = user!!
                    val vCard = "BEGIN:VCARD\nVERSION:3.0\nFN:${contactUser.fullName}\nTEL:${contactUser.countryCode}${contactUser.phone}\nEMAIL:${contactUser.email}\nORG:${contactUser.company}\nTITLE:${contactUser.title}\nEND:VCARD"
                    generateQRCode(context, vCard, qrSize)?.let { views.setImageViewBitmap(R.id.widget_qr_image, it) }
                    views.setContentDescription(R.id.widget_qr_image, "QR danh bạ của ${contactUser.fullName}")
                } else {
                    views.setImageViewBitmap(R.id.widget_qr_image, generateMessageBitmap(qrSize, "Vui lòng nhập thông tin eCard"))
                    views.setContentDescription(R.id.widget_qr_image, "Vui lòng nhập thông tin eCard")
                }

                if (isMedium) {
                    views.setTextViewText(R.id.widget_badge, "ECARD")
                    views.setTextViewText(R.id.widget_title, if (hasContactInfo) user?.fullName else "Chưa có eCard")
                    views.setTextViewText(R.id.widget_subtitle, if (hasContactInfo) user?.title else "Mở app để cập nhật")
                    views.setTextViewText(R.id.widget_extra, if (hasContactInfo) user?.company else "")
                }
            } else {
                val bankUser = user
                val hasBankInfo = bankUser != null && bankUser.bankCode.isNotBlank() && bankUser.bankAccount.isNotBlank()
                val bankName = displayBankName(bankUser?.bankCode ?: "")
                val qrBitmap = if (hasBankInfo) {
                    val vietQrUrl = buildVietQrUrl(bankUser!!)
                    downloadBitmap(vietQrUrl, qrSize)
                        ?: generatePlaceholderBitmap(qrSize, "VietQR", "Không tải được")
                } else {
                    generateMessageBitmap(qrSize, "Vui lòng nhập thông tin ngân hàng")
                }

                views.setImageViewBitmap(R.id.widget_qr_image, qrBitmap)
                views.setContentDescription(
                    R.id.widget_qr_image,
                    if (hasBankInfo) "QR thanh toán VietQR" else "Vui lòng nhập thông tin ngân hàng"
                )

                if (isMedium) {
                    views.setTextViewText(R.id.widget_badge, "VIETQR")
                    views.setTextViewText(R.id.widget_title, if (hasBankInfo) bankUser?.fullName else "Chưa có tài khoản")
                    views.setTextViewText(R.id.widget_subtitle, if (hasBankInfo) bankName else "Mở app để cập nhật")
                    views.setTextViewText(R.id.widget_extra, if (hasBankInfo) bankUser?.bankAccount else "")
                }
            }
        } catch (e: Exception) {
            Log.e("MKWidget", "Update Error: ${e.message}")
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun readUserData(context: Context): WidgetUserData? {
        val prefs = context.getSharedPreferences("group.com.mk.ecard", Context.MODE_PRIVATE)
        val userDataStr = prefs.getString("userData", null) ?: return null

        return try {
            val user = JSONObject(userDataStr)
            WidgetUserData(
                fullName = user.optCleanString("fullName"),
                phone = sanitizePhone(user.optString("phone", "")),
                email = user.optCleanString("email"),
                title = user.optCleanString("title"),
                company = user.optCleanString("company"),
                countryCode = normalizeCountryCode(user.optString("countryCode", "84")),
                bankCode = normalizeBankCode(user.optCleanString("bankName")),
                bankAccount = sanitizeBankAccount(user.optString("bankAccount", ""))
            )
        } catch (e: Exception) {
            Log.e("MKWidget", "Invalid user data: ${e.message}")
            null
        }
    }

    private fun JSONObject.optCleanString(key: String): String {
        return optString(key, "").trim()
    }

    private fun normalizeCountryCode(value: String): String {
        val digits = value.filter { it.isDigit() }.ifBlank { "84" }
        return "+$digits"
    }

    private fun normalizeBankCode(value: String): String {
        val normalized = value.trim().uppercase(Locale.US)
        return bankAliases[normalized]
            ?: normalized.replace(Regex("[^A-Z0-9]"), "")
    }

    private fun sanitizeBankAccount(value: String): String {
        return value.filter { it.isDigit() }
    }

    private fun sanitizePhone(value: String): String {
        return value.filter { it.isDigit() }.trimStart('0')
    }

    private fun displayBankName(bankCode: String): String {
        return bankDisplayNames[bankCode] ?: bankCode
    }

    private fun buildVietQrUrl(user: WidgetUserData): String {
        val accountName = URLEncoder.encode(user.fullName, "UTF-8").replace("+", "%20")
        return "https://img.vietqr.io/image/${user.bankCode}-${user.bankAccount}-qr_only.png?accountName=$accountName"
    }

    private fun downloadBitmap(urlString: String, size: Int): Bitmap? {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(urlString).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8000
                readTimeout = 8000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", "MKWidgetCard/1.0")
            }

            if (connection.responseCode !in 200..299) {
                return null
            }

            val bitmap = connection.inputStream.use { input ->
                BitmapFactory.decodeStream(input)
            }

            bitmap?.let { fitBitmapIntoSquare(it, size) }
        } catch (e: Exception) {
            Log.e("MKWidget", "VietQR download failed: ${e.message}")
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun fitBitmapIntoSquare(bitmap: Bitmap, size: Int): Bitmap {
        if (bitmap.width <= 0 || bitmap.height <= 0) return bitmap

        val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        val scale = minOf(size.toFloat() / bitmap.width, size.toFloat() / bitmap.height)
        val scaledWidth = bitmap.width * scale
        val scaledHeight = bitmap.height * scale
        val left = (size - scaledWidth) / 2f
        val top = (size - scaledHeight) / 2f

        canvas.drawColor(Color.WHITE)
        canvas.drawBitmap(bitmap, null, RectF(left, top, left + scaledWidth, top + scaledHeight), paint)
        return output
    }

    private fun generateQRCode(context: Context, content: String, size: Int): Bitmap? {
        return try {
            val writer = QRCodeWriter()
            val hints = mapOf(
                EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.Q,
                EncodeHintType.MARGIN to 1
            )
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) Color.BLACK else Color.WHITE)
                }
            }
            drawLogoBadge(context, bitmap)
        } catch (e: Exception) {
            null
        }
    }

    private fun drawLogoBadge(context: Context, source: Bitmap): Bitmap {
        val output = source.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        val size = minOf(output.width, output.height).toFloat()
        val badgeSize = size * 0.23f
        val logoSize = size * 0.18f
        val badgeLeft = (output.width - badgeSize) / 2f
        val badgeTop = (output.height - badgeSize) / 2f
        val badgeRect = RectF(badgeLeft, badgeTop, badgeLeft + badgeSize, badgeTop + badgeSize)

        paint.style = Paint.Style.FILL
        paint.color = Color.WHITE
        canvas.drawRoundRect(badgeRect, badgeSize * 0.22f, badgeSize * 0.22f, paint)

        val logo = BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher_foreground)
            ?: BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)

        if (logo != null) {
            val logoLeft = (output.width - logoSize) / 2f
            val logoTop = (output.height - logoSize) / 2f
            canvas.drawBitmap(logo, null, RectF(logoLeft, logoTop, logoLeft + logoSize, logoTop + logoSize), paint)
        } else {
            paint.color = Color.parseColor("#0A66C2")
            paint.textAlign = Paint.Align.CENTER
            paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            paint.textSize = size * 0.08f
            val y = output.height / 2f - (paint.descent() + paint.ascent()) / 2f
            canvas.drawText("MK", output.width / 2f, y, paint)
        }

        return output
    }

    private fun generateMessageBitmap(size: Int, message: String): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val background = RectF(0f, 0f, size.toFloat(), size.toFloat())

        paint.style = Paint.Style.FILL
        paint.color = Color.WHITE
        canvas.drawRoundRect(background, size * 0.08f, size * 0.08f, paint)

        drawFinder(canvas, paint, size * 0.14f, size * 0.14f, size * 0.16f)
        drawFinder(canvas, paint, size * 0.70f, size * 0.14f, size * 0.16f)
        drawFinder(canvas, paint, size * 0.14f, size * 0.70f, size * 0.16f)

        paint.style = Paint.Style.FILL
        paint.color = Color.parseColor("#111827")
        paint.textAlign = Paint.Align.CENTER
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = size * 0.058f

        val lines = wrapText(message, paint, size * 0.66f)
        val lineHeight = paint.textSize * 1.32f
        val startY = size / 2f - ((lines.size - 1) * lineHeight / 2f) - (paint.descent() + paint.ascent()) / 2f
        lines.forEachIndexed { index, line ->
            canvas.drawText(line, size / 2f, startY + index * lineHeight, paint)
        }

        return bitmap
    }

    private fun wrapText(text: String, paint: Paint, maxWidth: Float): List<String> {
        val words = text.split(" ")
        val lines = mutableListOf<String>()
        var currentLine = ""

        for (word in words) {
            val candidate = if (currentLine.isEmpty()) word else "$currentLine $word"
            if (paint.measureText(candidate) <= maxWidth) {
                currentLine = candidate
            } else {
                if (currentLine.isNotEmpty()) lines.add(currentLine)
                currentLine = word
            }
        }

        if (currentLine.isNotEmpty()) lines.add(currentLine)
        return lines.take(3)
    }

    private fun generatePlaceholderBitmap(size: Int, title: String, subtitle: String): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val background = RectF(0f, 0f, size.toFloat(), size.toFloat())

        paint.style = Paint.Style.FILL
        paint.color = Color.WHITE
        canvas.drawRoundRect(background, size * 0.08f, size * 0.08f, paint)

        drawFinder(canvas, paint, size * 0.18f, size * 0.18f, size * 0.16f)
        drawFinder(canvas, paint, size * 0.66f, size * 0.18f, size * 0.16f)
        drawFinder(canvas, paint, size * 0.18f, size * 0.66f, size * 0.16f)

        paint.style = Paint.Style.FILL
        paint.color = Color.parseColor("#1F2937")
        paint.textAlign = Paint.Align.CENTER
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        paint.textSize = size * 0.095f
        canvas.drawText(title, size / 2f, size * 0.52f, paint)

        paint.color = Color.parseColor("#64748B")
        paint.typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        paint.textSize = size * 0.052f
        canvas.drawText(subtitle, size / 2f, size * 0.6f, paint)

        return bitmap
    }

    private fun drawFinder(canvas: Canvas, paint: Paint, left: Float, top: Float, size: Float) {
        val radius = size * 0.16f
        val outer = RectF(left, top, left + size, top + size)
        val innerPadding = size * 0.28f
        val inner = RectF(
            left + innerPadding,
            top + innerPadding,
            left + size - innerPadding,
            top + size - innerPadding
        )

        paint.style = Paint.Style.STROKE
        paint.strokeWidth = size * 0.12f
        paint.color = Color.parseColor("#CBD5E1")
        canvas.drawRoundRect(outer, radius, radius, paint)

        paint.style = Paint.Style.FILL
        paint.color = Color.parseColor("#94A3B8")
        canvas.drawRoundRect(inner, radius * 0.7f, radius * 0.7f, paint)
    }
}

class ContactQRSmall : MKWidgetProvider()
class BankQRSmall : MKWidgetProvider()
class ContactMedium : MKWidgetProvider()
class BankMedium : MKWidgetProvider()
