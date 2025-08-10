# frozen_string_literal: true

class AddUniqueIndexOnReactionsStatus < ActiveRecord::Migration[8.0]
  def change
    remove_index :reactions, column: [:account_id, :status_id, :name], name: :index_reactions_on_account_id_and_status_id
    add_index :reactions, [:status_id, :account_id, :name, :custom_emoji_id], unique: true, name: :index_reactions_on_status_account_name_and_custom_emoji_id
  end
end
