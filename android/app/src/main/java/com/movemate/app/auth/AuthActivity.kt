package com.movemate.app.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.movemate.app.MainActivity
import com.movemate.app.R
import com.movemate.app.databinding.ActivityAuthBinding

class AuthActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAuthBinding
    private val viewModel: AuthViewModel by viewModels()

    // Mode: "login" | "register" | "forgot"
    private var mode = "login"

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            account.idToken?.let { viewModel.signInWithGoogle(it) }
                ?: showError("Google sign in failed: no ID token")
        } catch (e: ApiException) {
            showError("Google sign in failed: ${e.message}")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAuthBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupClickListeners()
        observeAuthState()
    }

    private fun setupClickListeners() {
        // Submit button
        binding.btnSubmit.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString()
            val confirm = binding.etConfirmPassword.text.toString()
            val rememberMe = binding.cbRememberMe.isChecked

            when (mode) {
                "login" -> viewModel.signInWithEmail(email, password, rememberMe)
                "register" -> viewModel.registerWithEmail(email, password, confirm)
                "forgot" -> viewModel.sendPasswordReset(email)
            }
        }

        // Google Sign In
        binding.btnGoogle.setOnClickListener { launchGoogleSignIn() }

        // Toggle login <-> register
        binding.tvToggleMode.setOnClickListener {
            mode = if (mode == "login") "register" else "login"
            updateUI()
        }

        // Forgot password link (only shown in login mode)
        binding.tvForgotPassword.setOnClickListener {
            mode = "forgot"
            updateUI()
        }

        // Back to login from forgot
        binding.tvBackToLogin.setOnClickListener {
            mode = "login"
            updateUI()
        }
    }

    private fun updateUI() {
        viewModel.resetState()
        binding.tilPassword.isVisible = mode != "forgot"
        binding.tilConfirmPassword.isVisible = mode == "register"
        binding.cbRememberMe.isVisible = mode == "login"
        binding.tvForgotPassword.isVisible = mode == "login"
        binding.tvBackToLogin.isVisible = mode == "forgot"
        binding.btnGoogle.isVisible = mode != "forgot"
        binding.dividerLayout.isVisible = mode != "forgot"
        binding.tvToggleMode.isVisible = mode != "forgot"

        binding.btnSubmit.text = when (mode) {
            "login" -> "Sign In"
            "register" -> "Create Account"
            "forgot" -> "Send Reset Email"
            else -> "Submit"
        }

        binding.tvTitle.text = when (mode) {
            "login" -> "Welcome back"
            "register" -> "Create account"
            "forgot" -> "Reset password"
            else -> "MoveMate"
        }

        binding.tvToggleMode.text = when (mode) {
            "login" -> "Don't have an account? Create one"
            "register" -> "Already have an account? Sign in"
            else -> ""
        }

        binding.tvSubtitle.text = when (mode) {
            "forgot" -> "Enter your email and we'll send a reset link"
            else -> "Your smart moving inventory tracker"
        }
    }

    private fun observeAuthState() {
        viewModel.authState.observe(this) { state ->
            when (state) {
                is AuthState.Idle -> setLoading(false)
                is AuthState.Loading -> setLoading(true)
                is AuthState.Success -> {
                    setLoading(false)
                    navigateToMain()
                }
                is AuthState.Error -> {
                    setLoading(false)
                    showError(state.message)
                }
                is AuthState.PasswordResetSent -> {
                    setLoading(false)
                    Toast.makeText(
                        this,
                        "Reset email sent to ${state.email}",
                        Toast.LENGTH_LONG
                    ).show()
                    mode = "login"
                    updateUI()
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.progressBar.isVisible = loading
        binding.btnSubmit.isEnabled = !loading
        binding.btnGoogle.isEnabled = !loading
        binding.btnSubmit.text = if (loading) "Please wait..." else when (mode) {
            "login" -> "Sign In"
            "register" -> "Create Account"
            "forgot" -> "Send Reset Email"
            else -> "Submit"
        }
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.isVisible = true
    }

    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun launchGoogleSignIn() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
        val client = GoogleSignIn.getClient(this, gso)
        googleSignInLauncher.launch(client.signInIntent)
    }
}
