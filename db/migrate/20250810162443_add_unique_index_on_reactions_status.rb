# frozen_string_literal: true

class AddUniqueIndexOnReactionsStatus < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    remove_index :reactions, name: :index_reactions_on_account_id_and_status_id, algorithm: :concurrently if index_name_exists?(:reactions, name: :index_reactions_on_account_id_and_status_id)
    add_index :reactions, [:status_id, :account_id, :name, :custom_emoji_id], unique: true, name: :index_reactions_on_status_account_name_and_custom_emoji_id, algorithm: :concurrently unless index_name_exists?(:reactions, name: :index_reactions_on_status_account_name_and_custom_emoji_id)
  end

  def down
    remove_index :reactions, name: :index_reactions_on_status_account_name_and_custom_emoji_id, algorithm: :concurrently if index_name_exists?(:reactions, name: :index_reactions_on_status_account_name_and_custom_emoji_id)
    add_index :reactions, [:account_id, :status_id, :name], unique: true, name: :index_reactions_on_account_id_and_status_id, algorithm: :concurrently unless index_name_exists?(:reactions, name: :index_reactions_on_account_id_and_status_id)
  end
end
