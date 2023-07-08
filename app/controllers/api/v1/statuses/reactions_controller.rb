# frozen_string_literal: true

class Api::V1::Statuses::ReactionsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write, :'write:favourites' }
  before_action :require_user!
  before_action :set_status, only: [:create, :update]

  def create
    ReactionService.new.call(current_account, @status, params[:name])
    render json: @status, serializer: REST::StatusSerializer
  end

  def update
    ReactionService.new.call(current_account, @status, params[:id])
    render json: @status, serializer: REST::StatusSerializer
  end

  def destroy
    reaction = Reaction.find_by_name(current_account, params[:status_id], params[:name])
    reactions = Reaction.select('id').where(account_id: current_account.id, status_id: params[:status_id])
  
    if reaction
      @status = reaction.status
      UnreactionWorker.perform_async(current_account.id, @status.id, params[:name])
    else
      @status = Status.find(params[:status_id])
      authorize @status, :show?
    end

    reactions_map = { @status.id => false } if reactions.size <= 1

    render json: @status, serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new([@status], current_account.id, reactions_map: reactions_map)
  rescue Mastodon::NotPermittedError
    not_found
  end

  private

  def set_status
    @status = Status.find(params[:status_id])
    authorize @status, :show?
  rescue Mastodon::NotPermittedError
    not_found
  end
end
