package com.movemate.app.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.movemate.app.databinding.ItemRowBinding
import com.movemate.app.model.Item

class ItemAdapter(
    private val onEdit: (Item) -> Unit,
    private val onDelete: (Item) -> Unit
) : ListAdapter<Item, ItemAdapter.ItemViewHolder>(DIFF_CALLBACK) {

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<Item>() {
            override fun areItemsTheSame(old: Item, new: Item) = old.id == new.id
            override fun areContentsTheSame(old: Item, new: Item) = old == new
        }
    }

    inner class ItemViewHolder(private val binding: ItemRowBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: Item) {
            binding.tvItemName.text = item.name
            binding.tvItemQuantity.text = "Qty: ${item.quantity}"
            binding.tvItemValueBand.text = item.valueBand
            binding.tvItemBoxNumber.text = "Box: ${item.boxNumber}"
            binding.tvItemNotes.text = item.notes
            binding.btnEditItem.setOnClickListener { onEdit(item) }
            binding.btnDeleteItem.setOnClickListener { onDelete(item) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ItemViewHolder {
        val binding = ItemRowBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ItemViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ItemViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}
