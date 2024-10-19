# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reaction do
  let(:account) { Fabricate(:account) }

  context 'when status is a reblog' do
    let(:reblog) { Fabricate(:status, reblog: nil) }
    let(:status) { Fabricate(:status, reblog: reblog) }

    it 'invalidates if the reblogged status is already a reaction' do
      described_class.create!(account: account, status: reblog, name: '✋')
      expect(described_class.new(account: account, status: status, name: '✋').valid?).to be false
    end

    it 'replaces status with the reblogged one if it is a reblog' do
      reaction = described_class.create!(account: account, status: status, name: '✋')
      expect(reaction.status).to eq reblog
    end
  end

  context 'when status is not a reblog' do
    let(:status) { Fabricate(:status, reblog: nil) }

    it 'saves with the specified status' do
      reaction = described_class.create!(account: account, status: status, name: '✋')
      expect(reaction.status).to eq status
    end
  end
end
