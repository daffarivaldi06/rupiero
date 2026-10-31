package expo.modules.applocale

import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Android's per-app language: native UI the app does not draw itself (the date picker's month and
// day names, its OK/Cancel buttons) follows the language chosen in Settings instead of the phone's.
class AppLocaleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppLocale")

    // A BCP-47 tag such as "id" or "en", or null to follow the phone again.
    Function("setAppLocale") { tag: String? ->
      val locales = if (tag.isNullOrEmpty()) LocaleListCompat.getEmptyLocaleList() else LocaleListCompat.forLanguageTags(tag)
      Handler(Looper.getMainLooper()).post {
        if (AppCompatDelegate.getApplicationLocales() != locales) AppCompatDelegate.setApplicationLocales(locales)
      }
    }
  }
}
