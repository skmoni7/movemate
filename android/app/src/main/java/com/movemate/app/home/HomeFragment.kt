package com.movemate.app.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.GridLayoutManager
import com.google.android.material.chip.Chip
import com.google.firebase.auth.FirebaseAuth
import com.movemate.app.R
import com.movemate.app.auth.AuthActivity
import com.movemate.app.databinding.FragmentHomeBinding
import com.movemate.app.databinding.DialogAddRoomBinding
import com.movemate.app.model.ROOM_SUGGESTIONS

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: HomeViewModel by viewModels()
    private lateinit var adapter: RoomAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupFab()
        setupSignOut()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = RoomAdapter(
            onRoomClick = { room ->
                val action = HomeFragmentDirections.actionHomeToRoom(
                    roomId = room.id,
                    roomName = room.name,
                    roomIcon = room.icon
                )
                findNavController().navigate(action)
            },
            onRoomDelete = { room ->
                AlertDialog.Builder(requireContext())
                    .setTitle("Delete ${room.name}?")
                    .setMessage("This will permanently delete the room and all its items.")
                    .setPositiveButton("Delete") { _, _ -> viewModel.deleteRoom(room.id) }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        )
        binding.rvRooms.layoutManager = GridLayoutManager(requireContext(), 2)
        binding.rvRooms.adapter = adapter
    }

    private fun setupFab() {
        binding.fabAddRoom.setOnClickListener { showAddRoomDialog() }
    }

    private fun setupSignOut() {
        binding.btnSignOut.setOnClickListener {
            FirebaseAuth.getInstance().signOut()
            startActivity(android.content.Intent(requireContext(), AuthActivity::class.java))
            requireActivity().finish()
        }
    }

    private fun observeViewModel() {
        viewModel.rooms.observe(viewLifecycleOwner) { rooms ->
            adapter.submitList(rooms)
            binding.tvEmpty.visibility = if (rooms.isEmpty()) View.VISIBLE else View.GONE
        }
        viewModel.loading.observe(viewLifecycleOwner) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        }
        viewModel.error.observe(viewLifecycleOwner) { err ->
            err?.let { Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show() }
        }
    }

    private fun showAddRoomDialog() {
        val dialogBinding = DialogAddRoomBinding.inflate(layoutInflater)
        var selectedIcon = "📦"

        // Populate suggestion chips
        ROOM_SUGGESTIONS.forEach { suggestion ->
            val chip = Chip(requireContext()).apply {
                text = "${suggestion.icon} ${suggestion.name}"
                isCheckable = true
                setOnClickListener {
                    dialogBinding.etRoomName.setText(suggestion.name)
                    selectedIcon = suggestion.icon
                }
            }
            dialogBinding.chipGroupSuggestions.addView(chip)
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Add Room")
            .setView(dialogBinding.root)
            .setPositiveButton("Add") { _, _ ->
                val name = dialogBinding.etRoomName.text.toString().trim()
                if (name.isNotEmpty()) {
                    viewModel.addRoom(name, selectedIcon)
                } else {
                    Toast.makeText(requireContext(), "Room name required", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
