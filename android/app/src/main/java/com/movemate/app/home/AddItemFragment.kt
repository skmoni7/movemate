package com.movemate.app.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.navigation.fragment.navArgs
import com.movemate.app.R
import com.movemate.app.databinding.FragmentAddItemBinding
import com.movemate.app.room.ItemViewModel

class AddItemFragment : Fragment() {

    private var _binding: FragmentAddItemBinding? = null
    private val binding get() = _binding!!
    private val args: AddItemFragmentArgs by navArgs()

    private val viewModel: ItemViewModel by viewModels {
        ItemViewModel.Factory(args.roomId)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAddItemBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Setup value band spinner
        val valueBands = resources.getStringArray(R.array.value_bands)
        val spinnerAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, valueBands)
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerValueBand.adapter = spinnerAdapter

        // If editing, load existing item
        val editItemId = args.itemId
        if (editItemId != null) {
            binding.tvTitle.text = getString(R.string.edit_item)
            viewModel.getItem(editItemId).observe(viewLifecycleOwner) { item ->
                item?.let {
                    binding.etItemName.setText(it.name)
                    binding.etQuantity.setText(it.quantity.toString())
                    binding.etBoxNumber.setText(it.boxNumber)
                    binding.etNotes.setText(it.notes)
                    val bandIndex = valueBands.indexOf(it.valueBand)
                    if (bandIndex >= 0) binding.spinnerValueBand.setSelection(bandIndex)
                }
            }
        } else {
            binding.tvTitle.text = getString(R.string.add_item)
            // Default box number to NA
            binding.etBoxNumber.setText("NA")
        }

        binding.btnSave.setOnClickListener {
            val name = binding.etItemName.text.toString().trim()
            if (name.isEmpty()) {
                Toast.makeText(requireContext(), getString(R.string.name_required), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val quantity = binding.etQuantity.text.toString().toIntOrNull() ?: 1
            val valueBand = binding.spinnerValueBand.selectedItem.toString()
            val boxNumber = binding.etBoxNumber.text.toString().trim().ifEmpty { "NA" }
            val notes = binding.etNotes.text.toString().trim()

            if (editItemId != null) {
                viewModel.updateItem(editItemId, name, quantity, valueBand, boxNumber, notes)
            } else {
                viewModel.addItem(name, quantity, valueBand, boxNumber, notes)
            }
            findNavController().navigateUp()
        }

        binding.btnCancel.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
