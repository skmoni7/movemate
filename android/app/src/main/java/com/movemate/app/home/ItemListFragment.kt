package com.movemate.app.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import com.movemate.app.databinding.FragmentItemListBinding
import com.movemate.app.room.ItemViewModel

class ItemListFragment : Fragment() {

    private var _binding: FragmentItemListBinding? = null
    private val binding get() = _binding!!
    private val args: ItemListFragmentArgs by navArgs()
    private lateinit var adapter: ItemAdapter

    private val viewModel: ItemViewModel by viewModels {
        ItemViewModel.Factory(args.roomId)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentItemListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = ItemAdapter(
            onEdit = { item ->
                val action = ItemListFragmentDirections
                    .actionItemListFragmentToAddItemFragment(args.roomId, item.id)
                findNavController().navigate(action)
            },
            onDelete = { item -> viewModel.deleteItem(item.id) }
        )

        binding.recyclerItems.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerItems.adapter = adapter

        binding.fabAddItem.setOnClickListener {
            val action = ItemListFragmentDirections
                .actionItemListFragmentToAddItemFragment(args.roomId, null)
            findNavController().navigate(action)
        }

        binding.btnBack.setOnClickListener {
            findNavController().navigateUp()
        }

        viewModel.items.observe(viewLifecycleOwner) { items ->
            adapter.submitList(items)
            binding.tvEmpty.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.roomName.observe(viewLifecycleOwner) { name ->
            binding.tvRoomTitle.text = name ?: args.roomId
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
