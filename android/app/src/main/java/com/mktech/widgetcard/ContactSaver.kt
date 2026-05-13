package com.mktech.widgetcard

import android.Manifest
import android.content.ContentProviderOperation
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.net.HttpURLConnection
import java.net.URL

class ContactSaver(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "ContactSaver"

    @ReactMethod
    fun saveContact(payload: ReadableMap, promise: Promise) {
        if (reactContext.checkSelfPermission(Manifest.permission.WRITE_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("contacts_permission_denied", "Contacts permission was denied.")
            return
        }

        try {
            val fullName = payload.cleanString("fullName")
            if (fullName.isBlank()) {
                promise.reject("contacts_save_failed", "Full name is required.")
                return
            }

            val (givenName, familyName) = splitName(fullName)
            val ops = ArrayList<ContentProviderOperation>()

            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null)
                    .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null)
                    .build()
            )

            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                    .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, fullName)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, givenName)
                    .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, familyName)
                    .build()
            )

            addOrganization(ops, payload)
            addPhone(ops, payload.cleanString("phone"))
            addEmail(ops, payload.cleanString("email"))
            addAddress(ops, payload.cleanString("address"))
            addWebsite(ops, payload.cleanString("website"), ContactsContract.CommonDataKinds.Website.TYPE_WORK)
            addWebsite(ops, payload.cleanString("linkedin"), ContactsContract.CommonDataKinds.Website.TYPE_OTHER, "LinkedIn")
            addWebsite(ops, payload.cleanString("facebook"), ContactsContract.CommonDataKinds.Website.TYPE_OTHER, "Facebook")
            addWebsite(ops, payload.cleanString("zaloUrl"), ContactsContract.CommonDataKinds.Website.TYPE_OTHER, "Zalo")
            addWebsite(ops, payload.cleanString("whatsappUrl"), ContactsContract.CommonDataKinds.Website.TYPE_OTHER, "WhatsApp")
            addWebsite(ops, payload.cleanString("telegramUrl"), ContactsContract.CommonDataKinds.Website.TYPE_OTHER, "Telegram")
            addInstantMessage(ops, "Zalo", payload.cleanString("zalo"))
            addInstantMessage(ops, "WhatsApp", payload.cleanString("whatsapp"))
            addInstantMessage(ops, "Telegram", payload.cleanString("telegram"))
            addNote(ops, payload.cleanString("note").ifBlank { payload.cleanString("bio") })
            addPhoto(ops, payload.cleanString("avatarUrl"))

            val results = reactContext.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
            promise.resolve(mapOf("saved" to true, "rawContactId" to (results.firstOrNull()?.uri?.lastPathSegment ?: "")))
        } catch (error: Exception) {
            promise.reject("contacts_save_failed", "Unable to save contact.", error)
        }
    }

    private fun addOrganization(ops: ArrayList<ContentProviderOperation>, payload: ReadableMap) {
        val company = payload.cleanString("company")
        val title = payload.cleanString("title")
        val department = payload.cleanString("department")
        if (company.isBlank() && title.isBlank() && department.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, company)
                .withValue(ContactsContract.CommonDataKinds.Organization.TITLE, title)
                .withValue(ContactsContract.CommonDataKinds.Organization.DEPARTMENT, department)
                .build()
        )
    }

    private fun addPhone(ops: ArrayList<ContentProviderOperation>, phone: String) {
        if (phone.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone)
                .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                .build()
        )
    }

    private fun addEmail(ops: ArrayList<ContentProviderOperation>, email: String) {
        if (email.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Email.ADDRESS, email)
                .withValue(ContactsContract.CommonDataKinds.Email.TYPE, ContactsContract.CommonDataKinds.Email.TYPE_WORK)
                .build()
        )
    }

    private fun addAddress(ops: ArrayList<ContentProviderOperation>, address: String) {
        if (address.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS, address)
                .withValue(ContactsContract.CommonDataKinds.StructuredPostal.TYPE, ContactsContract.CommonDataKinds.StructuredPostal.TYPE_WORK)
                .build()
        )
    }

    private fun addWebsite(
        ops: ArrayList<ContentProviderOperation>,
        url: String,
        type: Int,
        label: String? = null
    ) {
        if (url.isBlank()) return

        val builder = ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
            .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
            .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Website.CONTENT_ITEM_TYPE)
            .withValue(ContactsContract.CommonDataKinds.Website.URL, url)
            .withValue(ContactsContract.CommonDataKinds.Website.TYPE, type)

        if (!label.isNullOrBlank()) {
            builder.withValue(ContactsContract.CommonDataKinds.Website.LABEL, label)
        }

        ops.add(builder.build())
    }

    private fun addInstantMessage(ops: ArrayList<ContentProviderOperation>, service: String, username: String) {
        if (username.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Im.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Im.DATA, username)
                .withValue(ContactsContract.CommonDataKinds.Im.TYPE, ContactsContract.CommonDataKinds.Im.TYPE_OTHER)
                .withValue(ContactsContract.CommonDataKinds.Im.PROTOCOL, ContactsContract.CommonDataKinds.Im.PROTOCOL_CUSTOM)
                .withValue(ContactsContract.CommonDataKinds.Im.CUSTOM_PROTOCOL, service)
                .build()
        )
    }

    private fun addNote(ops: ArrayList<ContentProviderOperation>, note: String) {
        if (note.isBlank()) return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Note.NOTE, note)
                .build()
        )
    }

    private fun addPhoto(ops: ArrayList<ContentProviderOperation>, avatarUrl: String) {
        val bytes = loadPhotoBytes(avatarUrl) ?: return

        ops.add(
            ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                .withValue(ContactsContract.Data.MIMETYPE, ContactsContract.CommonDataKinds.Photo.CONTENT_ITEM_TYPE)
                .withValue(ContactsContract.CommonDataKinds.Photo.PHOTO, bytes)
                .build()
        )
    }

    private fun loadPhotoBytes(value: String): ByteArray? {
        if (value.isBlank()) return null

        return when {
            value.startsWith("data:image/", ignoreCase = true) -> {
                val commaIndex = value.indexOf(',')
                if (commaIndex < 0) null else Base64.decode(value.substring(commaIndex + 1), Base64.DEFAULT)
            }
            value.startsWith("http://", ignoreCase = true) || value.startsWith("https://", ignoreCase = true) -> {
                val connection = (URL(value).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 8000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "MKWidgetCard/1.0")
                }

                try {
                    if (connection.responseCode !in 200..299) {
                        null
                    } else {
                        connection.inputStream.use { it.readBytes() }
                    }
                } finally {
                    connection.disconnect()
                }
            }
            value.startsWith("file://", ignoreCase = true) || value.startsWith("content://", ignoreCase = true) -> {
                reactContext.contentResolver.openInputStream(Uri.parse(value))?.use { it.readBytes() }
            }
            else -> null
        }
    }

    private fun ReadableMap.cleanString(key: String): String {
        return if (hasKey(key) && !isNull(key)) {
            getString(key)?.trim().orEmpty()
        } else {
            ""
        }
    }

    private fun splitName(fullName: String): Pair<String, String> {
        val parts = fullName.split(Regex("\\s+")).filter { it.isNotBlank() }
        if (parts.size <= 1) return fullName to ""

        return parts.dropLast(1).joinToString(" ") to parts.last()
    }
}
