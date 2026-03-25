package com.transporthq.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.transporthq.app.data.models.User
import com.transporthq.app.data.repository.AuthRepository
import com.transporthq.app.ui.components.BottomNavBar
import com.transporthq.app.ui.components.TopBar
import com.transporthq.app.ui.screens.coordinator.DashboardScreen
import com.transporthq.app.ui.screens.coordinator.LiveMapScreen
import com.transporthq.app.ui.screens.coordinator.RideRequestsScreen
import com.transporthq.app.ui.screens.coordinator.TripsScreen
import com.transporthq.app.ui.screens.driver.DriverMyRidesScreen
import com.transporthq.app.ui.screens.driver.DriverMyTripsScreen
import com.transporthq.app.ui.screens.login.LoginScreen
import com.transporthq.app.ui.screens.login.LoginViewModel
import com.transporthq.app.ui.screens.passenger.PassengerMyRidesScreen
import com.transporthq.app.ui.screens.passenger.PassengerMyTripsScreen
import com.transporthq.app.ui.screens.passenger.TrackDriverScreen
import kotlinx.coroutines.launch

@Composable
fun AppNavigation() {
    val context = LocalContext.current
    val authRepository = remember { AuthRepository(context) }
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()

    var currentUser by remember { mutableStateOf<User?>(null) }
    var isLoggedIn by remember { mutableStateOf(false) }
    var isCheckingAuth by remember { mutableStateOf(true) }

    // Check for saved session
    LaunchedEffect(Unit) {
        val session = authRepository.restoreSession()
        if (session != null) {
            currentUser = session.second
            isLoggedIn = true
        }
        isCheckingAuth = false
    }

    val onLoginSuccess: (User) -> Unit = { user ->
        currentUser = user
        isLoggedIn = true
    }

    val onLogout: () -> Unit = {
        scope.launch {
            authRepository.logout()
            currentUser = null
            isLoggedIn = false
            navController.navigate("login") {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    if (isCheckingAuth) {
        // Show nothing while checking auth
        return
    }

    val startDestination = if (isLoggedIn && currentUser != null) {
        when (currentUser!!.role) {
            "coordinator" -> "coordinator/dashboard"
            "driver" -> "driver/trips"
            "passenger" -> "passenger/trips"
            else -> "login"
        }
    } else {
        "login"
    }

    val showScaffold = isLoggedIn && currentUser != null

    if (showScaffold) {
        val role = currentUser!!.role
        Scaffold(
            topBar = {
                TopBar(
                    title = "TransportHQ",
                    onLogout = onLogout
                )
            },
            bottomBar = {
                BottomNavBar(
                    navController = navController,
                    role = role
                )
            }
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = startDestination,
                modifier = Modifier.padding(paddingValues)
            ) {
                // Coordinator routes
                composable("coordinator/dashboard") {
                    DashboardScreen()
                }
                composable("coordinator/trips") {
                    TripsScreen()
                }
                composable("coordinator/rides") {
                    RideRequestsScreen()
                }
                composable("coordinator/map") {
                    LiveMapScreen()
                }

                // Driver routes
                composable("driver/trips") {
                    DriverMyTripsScreen()
                }
                composable("driver/rides") {
                    DriverMyRidesScreen()
                }

                // Passenger routes
                composable("passenger/trips") {
                    PassengerMyTripsScreen()
                }
                composable("passenger/rides") {
                    PassengerMyRidesScreen(
                        onTrackDriver = { rideId ->
                            navController.navigate("passenger/track/$rideId")
                        }
                    )
                }
                composable("passenger/track/{rideId}") { backStackEntry ->
                    val rideId = backStackEntry.arguments?.getString("rideId") ?: ""
                    TrackDriverScreen(
                        rideId = rideId,
                        onBack = { navController.popBackStack() }
                    )
                }
            }
        }
    } else {
        NavHost(
            navController = navController,
            startDestination = "login"
        ) {
            composable("login") {
                LoginScreen(onLoginSuccess = onLoginSuccess)
            }
        }
    }
}
