# frozen_string_literal: true

class ReactionService < BaseService
  include Authorization
  include Payloadable

  # Favourite a status and notify remote user
  # @param [Account] account
  # @param [Status] status
  # @param [name] unicode emoji or custom emoji shortcode
  # @return [StatusReaction]
  def call(account, status, name)
    authorize_with account, status, :favourite?

    reaction = Reaction.find_by(account: account, status: status, name: name)

    return reaction unless reaction.nil?

    reaction = Reaction.create!(account: account, status: status, name: name)

    Trends.statuses.register(status)

    create_notification(account, reaction)
    bump_potential_friendship(account, status)

    reaction
  end

  private

  def create_notification(current_account, reaction)
    status = reaction.status

    if status.account.local?
      LocalNotificationWorker.perform_async(status.account_id, reaction.id, 'Reaction', 'reaction')
    end
    ActivityPub::ReactionsDistributionWorker.perform_async(build_json(reaction), current_account.id, status.account.shared_inbox_url)
  end

  def bump_potential_friendship(account, status)
    return if account.following?(status.account_id)
    ActivityTracker.increment('activity:interactions')
  end

  def build_json(reaction)
    Oj.dump(serialize_payload(reaction, ActivityPub::EmojiReactSerializer))
  end
end
