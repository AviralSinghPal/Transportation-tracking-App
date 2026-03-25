package com.transporthq.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Indigo600,
    onPrimary = White,
    primaryContainer = Indigo100,
    onPrimaryContainer = Indigo700,
    secondary = Green600,
    onSecondary = White,
    secondaryContainer = Green100,
    onSecondaryContainer = Green700,
    tertiary = Blue500,
    onTertiary = White,
    tertiaryContainer = Blue100,
    onTertiaryContainer = Blue600,
    error = Red500,
    onError = White,
    errorContainer = Red100,
    onErrorContainer = Red600,
    background = Gray50,
    onBackground = Gray900,
    surface = White,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray600,
    outline = Gray300,
    outlineVariant = Gray200
)

private val DarkColorScheme = darkColorScheme(
    primary = Indigo400,
    onPrimary = White,
    primaryContainer = Indigo700,
    onPrimaryContainer = Indigo100,
    secondary = Green500,
    onSecondary = White,
    secondaryContainer = Green700,
    onSecondaryContainer = Green100,
    tertiary = Blue500,
    onTertiary = White,
    error = Red500,
    onError = White,
    background = Gray900,
    onBackground = Gray50,
    surface = Gray800,
    onSurface = Gray50,
    surfaceVariant = Gray700,
    onSurfaceVariant = Gray300,
    outline = Gray500,
    outlineVariant = Gray600
)

@Composable
fun TransportHQTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Indigo600.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
