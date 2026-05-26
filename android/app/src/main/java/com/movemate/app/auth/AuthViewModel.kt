package com.movemate.app.auth

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: FirebaseUser) : AuthState()
    data class Error(val message: String) : AuthState()
    data class PasswordResetSent(val email: String) : AuthState()
}

class AuthViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()

    private val _authState = MutableLiveData<AuthState>(AuthState.Idle)
    val authState: LiveData<AuthState> = _authState

    val currentUser: FirebaseUser? get() = auth.currentUser

    // --- Email / Password Sign In ---
    fun signInWithEmail(email: String, password: String, rememberMe: Boolean) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                val persistence = if (rememberMe)
                    com.google.firebase.auth.ktx.auth // LOCAL — survives app restarts
                else null
                // Firebase Android SDK persists LOCAL by default; for session-only we
                // sign in normally and clear on next cold start if rememberMe is false.
                // We store the rememberMe flag in DataStore and clear auth on launch if needed.
                val result = auth.signInWithEmailAndPassword(email, password).await()
                result.user?.let { _authState.value = AuthState.Success(it) }
                    ?: run { _authState.value = AuthState.Error("Sign in failed") }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Sign in failed")
            }
        }
    }

    // --- Email / Password Register ---
    fun registerWithEmail(email: String, password: String, confirmPassword: String) {
        if (password != confirmPassword) {
            _authState.value = AuthState.Error("Passwords do not match")
            return
        }
        if (password.length < 6) {
            _authState.value = AuthState.Error("Password must be at least 6 characters")
            return
        }
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                val result = auth.createUserWithEmailAndPassword(email, password).await()
                result.user?.let { _authState.value = AuthState.Success(it) }
                    ?: run { _authState.value = AuthState.Error("Registration failed") }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Registration failed")
            }
        }
    }

    // --- Forgot Password ---
    fun sendPasswordReset(email: String) {
        if (email.isBlank()) {
            _authState.value = AuthState.Error("Please enter your email address")
            return
        }
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                auth.sendPasswordResetEmail(email.trim()).await()
                _authState.value = AuthState.PasswordResetSent(email.trim())
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Failed to send reset email")
            }
        }
    }

    // --- Google Sign In ---
    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                val result = auth.signInWithCredential(credential).await()
                result.user?.let { _authState.value = AuthState.Success(it) }
                    ?: run { _authState.value = AuthState.Error("Google sign in failed") }
            } catch (e: Exception) {
                _authState.value = AuthState.Error(e.message ?: "Google sign in failed")
            }
        }
    }

    fun signOut() {
        auth.signOut()
    }

    fun resetState() {
        _authState.value = AuthState.Idle
    }
}
