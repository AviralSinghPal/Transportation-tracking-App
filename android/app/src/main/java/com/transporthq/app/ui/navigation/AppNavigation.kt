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
import com.transporthq.app.ui.screens.coordinator.AnalyticsScreen
import com.transporthq.app.ui.screens.coordinator.CreateTripScreen
import com.transporthq.app.ui.screens.coordinator.MaintenanceScreen
import com.transporthq.app.ui.screens.coordinator.ShuttlesScreen
import com.transporthq.app.ui.screens.coordinator.TalentScreen
import com.transporthq.app.ui.screens.coordinator.TemplatesScreen
import com.transporthq.app.ui.screens.coordinator.DriversScreen
import com.transporthq.app.ui.screens.coordinator.FleetScreen
import com.transporthq.app.ui.screens.coordinator.PermanentAllocationsScreen
import com.transporthq.app.ui.screens.coordinator.TripDetailScreen
import com.transporthq.app.ui.screens.coordinator.LiveMapScreen
import com.transporthq.app.ui.screens.coordinator.RideRequestsScreen
import com.transporthq.app.ui.screens.coordinator.TripsScreen
import com.transporthq.app.ui.screens.driver.DriverMapScreen
import com.transporthq.app.ui.screens.driver.DriverMyRidesScreen
import com.transporthq.app.ui.screens.driver.DriverMyTripsScreen
import com.transporthq.app.ui.screens.common.ChatConversationScreen
import com.transporthq.app.ui.screens.common.ChatScreen
import com.transporthq.app.ui.screens.common.NotificationsScreen
import com.transporthq.app.ui.screens.common.SettingsScreen
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
                    onLogout = onLogout,
                    onNotifications = { navController.navigate("notifications") },
                    onChat = { navController.navigate("chat") },
                    onSettings = { navController.navigate("settings") }
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
                // Common routes
                composable("settings") {
                    SettingsScreen(
                        onLogout = onLogout,
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("notifications") {
                    NotificationsScreen(onBack = { navController.popBackStack() })
                }
                composable("chat") {
                    ChatScreen(
                        onBack = { navController.popBackStack() },
                        onOpenConversation = { userId, userName ->
                            navController.navigate("chat/$userId/$userName")
                        }
                    )
                }
                composable("chat/{userId}/{userName}") { backStackEntry ->
                    val userId = backStackEntry.arguments?.getString("userId") ?: ""
                    val userName = backStackEntry.arguments?.getString("userName") ?: ""
                    ChatConversationScreen(
                        userId = userId, userName = userName,
                        onBack = { navController.popBackStack() }
                    )
                }

                // Coordinator routes
                composable("coordinator/dashboard") {
                    DashboardScreen()
                }
                composable("coordinator/trips") {
                    TripsScreen(
                        onCreateTrip = { navController.navigate("coordinator/trips/create") },
                        onTripClick = { tripId -> navController.navigate("coordinator/trips/$tripId") }
                    )
                }
                composable("coordinator/trips/create") {
                    CreateTripScreen(onBack = { navController.popBackStack() })
                }
                composable("coordinator/trips/{tripId}") { backStackEntry ->
                    val tripId = backStackEntry.arguments?.getString("tripId") ?: ""
                    TripDetailScreen(tripId = tripId, onBack = { navController.popBackStack() })
                }
                composable("coordinator/rides") {
                    RideRequestsScreen()
                }
                composable("coordinator/fleet") {
                    FleetScreen()
                }
                composable("coordinator/drivers") {
                    DriversScreen()
                }
                composable("coordinator/allocations") {
                    PermanentAllocationsScreen()
                }
                composable("coordinator/analytics") {
                    AnalyticsScreen()
                }
                composable("coordinator/maintenance") {
                    MaintenanceScreen()
                }
                composable("coordinator/shuttles") {
                    ShuttlesScreen()
                }
                composable("coordinator/templates") {
                    TemplatesScreen()
                }
                composable("coordinator/talent") {
                    TalentScreen()
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
                composable("driver/map") {
                    DriverMapScreen()
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
