# frozen_string_literal: true

class ActivityPub::ReactionsDistributionWorker < ActivityPub::RawDistributionWorker
  # Distribute reactions to servers that might have a copy
  # of the account in question
  def perform(json, source_account_id)
    @account = Account.find(source_account_id)
    @json    = json

    distribute!
  rescue ActiveRecord::RecordNotFound
    true
  end

  protected

  def inboxes
    @inboxes ||= AccountReachFinder.new(@account).inboxes
  end

  def payload
    @json
  end
end
