import { connect } from 'react-redux';

import { fetchRelationships } from 'mastodon/actions/accounts';

import { openDropdownMenu, closeDropdownMenu } from '../actions/dropdown_menu';
import { openModal, closeModal } from '../actions/modal';
import ReactionDropdownMenu from '../components/reaction_dropdown_menu';
import { isUserTouching } from '../is_mobile';

/**
 * @param {import('mastodon/store').RootState} state
 */
const mapStateToProps = state => ({
  openDropdownId: state.dropdownMenu.openId,
  openedViaKeyboard: state.dropdownMenu.keyboard,
});

const mapDispatchToProps = (dispatch, { status, scrollKey }) => ({
  onOpen(id, onReaction, keyboard) {
    if (status) {
      dispatch(fetchRelationships([status.getIn(['account', 'id'])]));
    }

    dispatch(isUserTouching() ? openModal({
      modalType: 'REACTION',
      modalProps: {
        status,
        onReaction,
      }
    }) : openDropdownMenu({ id, keyboard, scrollKey }));
  },

  onClose(id) {
    dispatch(closeModal({
      modalType: 'REACTION',
      ignoreFocus: false,
    }));
    dispatch(closeDropdownMenu({ id }));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ReactionDropdownMenu);
