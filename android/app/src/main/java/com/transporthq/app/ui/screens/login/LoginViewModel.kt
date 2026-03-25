package com.transporthq.app.ui.screens.login

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.transporthq.app.data.models.AuthState
import com.transporthq.app.data.models.User
import com.transporthq.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel(application: Application) : AndroidViewModel(application) {

    private val authRepository = AuthRepository(application)

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    fun login(email: String, password: String, onSuccess: (User) -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.login(email, password)
            result.fold(
                onSuccess = { loginResponse ->
                    _state.update {
                        it.copy(
                            isLoggedIn = true,
                            token = loginResponse.token,
                            user = loginResponse.user,
                            isLoading = false,
                            error = null
                        )
                    }
                    onSuccess(loginResponse.user)
                },
                onFailure = { error ->
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Login failed"
                        )
                    }
                }
            )
        }
    }
}
