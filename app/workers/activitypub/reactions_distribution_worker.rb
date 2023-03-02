# frozen_string_literal: true

class ActivityPub::ReactionsDistributionWorker < ActivityPub::DistributionWorker
  # Distribute reactions to servers that might have a copy
  # of the account in question
  def perform(json, source_account_id, status_id)
    @account = Account.find(source_account_id)
    @json    = json
    @status  = Status.find(status_id)

    distribute!
  rescue ActiveRecord::RecordNotFound
    true
  end

  protected

  def payload
    @json
  end
end
