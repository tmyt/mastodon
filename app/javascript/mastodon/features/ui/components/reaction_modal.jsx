import PropTypes from 'prop-types';
import React from 'react';

import { injectIntl } from 'react-intl';

import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';

import AttachmentList from 'mastodon/components/attachment_list';
import { VisibilityIcon } from 'mastodon/components/visibility_icon';

import { Avatar } from '../../../components/avatar';
import { DisplayName } from '../../../components/display_name';
import { RelativeTimestamp } from '../../../components/relative_timestamp';
import StatusContent from '../../../components/status_content';
import ReactionPickerContainer from '../../../containers/reaction_picker_container';

class ReactionModal extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    onReaction: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleAccountClick = (e) => {
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.props.onClose();
      this.context.router.history.push(`/@${this.props.status.getIn(['account', 'acct'])}`);
    }
  };

  render () {
    const { status } = this.props;

    return (
      <div className='modal-root__modal reaction-modal'>
        <div className='reaction-modal__container'>
          <div className={classNames('status', `status-${status.get('visibility')}`)}>
            <div className='status__info'>
              <a href={`/@${status.getIn(['account', 'acct'])}/${status.get('id')}`} className='status__relative-time' target='_blank' rel='noopener noreferrer'>
                <span className='status__visibility-icon'><VisibilityIcon visibility={status.get('visibility')} /></span>
                <RelativeTimestamp timestamp={status.get('created_at')} />
              </a>

              <a onClick={this.handleAccountClick} href={`/@${status.getIn(['account', 'acct'])}`} className='status__display-name'>
                <div className='status__avatar'>
                  <Avatar account={status.get('account')} size={48} />
                </div>

                <DisplayName account={status.get('account')} />
              </a>
            </div>

            <StatusContent status={status} />

            {status.get('media_attachments').size > 0 && (
              <AttachmentList
                compact
                media={status.get('media_attachments')}
              />
            )}
          </div>
          <ReactionPickerContainer onPickEmoji={this.props.onReaction} onClose={this.props.onClose} />
        </div>
      </div>
    );
  }

}

export default injectIntl(ReactionModal);