# frozen_string_literal: true

class REST::NotificationSerializer < ActiveModel::Serializer
  attributes :id, :type, :created_at

  belongs_to :from_account, key: :account, serializer: REST::AccountSerializer
  belongs_to :target_status, key: :status, if: :status_type?, serializer: REST::StatusSerializer
  belongs_to :report, if: :report_type?, serializer: REST::ReportSerializer

  def id
    object.id.to_s
  end

  def type
    return "emoji_reaction" if object.type == :reaction
    object.type
  end

  def status_type?
    [:favourite, :reaction, :reblog, :status, :mention, :poll, :update].include?(object.type)
  end

  def report_type?
    object.type == :'admin.report'
  end
end
