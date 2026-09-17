import PropTypes from 'prop-types';
import React from 'react';

import { defineMessages, FormattedMessage } from 'react-intl';

import classNames from 'classnames';

import { supportsPassiveEvents } from 'detect-passive-events';

import { injectIntl } from '@/mastodon/components/intl';

import { EmojiPicker as EmojiPickerAsync } from '../features/ui/util/async-components';

import { CircularProgress } from './circular_progress';

const messages = defineMessages({
  emoji: { id: 'emoji_button.label', defaultMessage: 'Insert emoji' },
  emoji_search: { id: 'emoji_button.search', defaultMessage: 'Search...' },
  custom: { id: 'emoji_button.custom', defaultMessage: 'Custom' },
  recent: { id: 'emoji_button.recent', defaultMessage: 'Frequently used' },
  search_results: { id: 'emoji_button.search_results', defaultMessage: 'Search results' },
  people: { id: 'emoji_button.people', defaultMessage: 'People' },
  nature: { id: 'emoji_button.nature', defaultMessage: 'Nature' },
  food: { id: 'emoji_button.food', defaultMessage: 'Food & Drink' },
  activity: { id: 'emoji_button.activity', defaultMessage: 'Activity' },
  travel: { id: 'emoji_button.travel', defaultMessage: 'Travel & Places' },
  objects: { id: 'emoji_button.objects', defaultMessage: 'Objects' },
  symbols: { id: 'emoji_button.symbols', defaultMessage: 'Symbols' },
  flags: { id: 'emoji_button.flags', defaultMessage: 'Flags' },
});

let EmojiPicker, Emoji; // load asynchronously

const listenerOptions = supportsPassiveEvents ? { passive: true } : false;

const notFoundFn = () => (
  <div className='emoji-mart-no-results'>
    <Emoji
      emoji='sleuth_or_spy'
      size={32}
    />

    <div className='emoji-mart-no-results-label'>
      <FormattedMessage id='emoji_button.not_found' defaultMessage='No matching emojis found' />
    </div>
  </div>
);

class ModifierPickerMenu extends React.PureComponent {

  static propTypes = {
    active: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  handleClick = e => {
    this.props.onSelect(e.currentTarget.getAttribute('data-index') * 1);
  };

  UNSAFE__componentWillReceiveProps (nextProps) {
    if (nextProps.active) {
      this.attachListeners();
    } else {
      this.removeListeners();
    }
  }

  componentWillUnmount () {
    this.removeListeners();
  }

  handleDocumentClick = e => {
    if (this.node && !this.node.contains(e.target)) {
      this.props.onClose();
    }
  };

  attachListeners () {
    document.addEventListener('click', this.handleDocumentClick, false);
    document.addEventListener('touchend', this.handleDocumentClick, listenerOptions);
  }

  removeListeners () {
    document.removeEventListener('click', this.handleDocumentClick, false);
    document.removeEventListener('touchend', this.handleDocumentClick, listenerOptions);
  }

  setRef = c => {
    this.node = c;
  };

  render () {
    const { active } = this.props;

    return (
      <div className='emoji-picker-dropdown__modifiers__menu' style={{ display: active ? 'block' : 'none' }} ref={this.setRef}>
        <button type='button' onClick={this.handleClick} data-index={1}><Emoji emoji='fist' size={22} skin={1} /></button>
        <button type='button' onClick={this.handleClick} data-index={2}><Emoji emoji='fist' size={22} skin={2} /></button>
        <button type='button' onClick={this.handleClick} data-index={3}><Emoji emoji='fist' size={22} skin={3} /></button>
        <button type='button' onClick={this.handleClick} data-index={4}><Emoji emoji='fist' size={22} skin={4} /></button>
        <button type='button' onClick={this.handleClick} data-index={5}><Emoji emoji='fist' size={22} skin={5} /></button>
        <button type='button' onClick={this.handleClick} data-index={6}><Emoji emoji='fist' size={22} skin={6} /></button>
      </div>
    );
  }

}

class ModifierPicker extends React.PureComponent {

  static propTypes = {
    active: PropTypes.bool,
    modifier: PropTypes.number,
    onChange: PropTypes.func,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
  };

  handleClick = () => {
    if (this.props.active) {
      this.props.onClose();
    } else {
      this.props.onOpen();
    }
  };

  handleSelect = modifier => {
    this.props.onChange(modifier);
    this.props.onClose();
  };

  render () {
    const { active, modifier } = this.props;

    return (
      <div className='emoji-picker-dropdown__modifiers'>
        <Emoji emoji='fist' size={22} skin={modifier} onClick={this.handleClick} />
        <ModifierPickerMenu active={active} onSelect={this.handleSelect} onClose={this.props.onClose} />
      </div>
    );
  }

}

class ReactionPickerMenu extends React.PureComponent {

  static propTypes = {
    frequentlyUsedEmojis: PropTypes.arrayOf(PropTypes.string),
    onPick: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    skinTone: PropTypes.number.isRequired,
    onSkinTone: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  static defaultProps = {
    frequentlyUsedEmojis: [],
  };

  state = {
    loading: true,
    modifierOpen: false,
    readyToFocus: false,
  };

  getI18n = () => {
    const { intl } = this.props;

    return {
      search: intl.formatMessage(messages.emoji_search),
      categories: {
        search: intl.formatMessage(messages.search_results),
        recent: intl.formatMessage(messages.recent),
        people: intl.formatMessage(messages.people),
        nature: intl.formatMessage(messages.nature),
        foods: intl.formatMessage(messages.food),
        activity: intl.formatMessage(messages.activity),
        places: intl.formatMessage(messages.travel),
        objects: intl.formatMessage(messages.objects),
        symbols: intl.formatMessage(messages.symbols),
        flags: intl.formatMessage(messages.flags),
        custom: intl.formatMessage(messages.custom),
      },
    };
  };

  handleClick = (emoji, event) => {
    if (!emoji.native) {
      emoji.native = emoji.colons;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      this.props.onClose();
    }
    this.props.onPick(emoji);
  };

  handleModifierOpen = () => {
    this.setState({ modifierOpen: true });
  };

  handleModifierClose = () => {
    this.setState({ modifierOpen: false });
  };

  handleModifierChange = modifier => {
    this.props.onSkinTone(modifier);
  };

  componentDidMount () {
    if (!EmojiPicker) {
      this.setState({ loading: true });

      EmojiPickerAsync().then(EmojiMart => {
        EmojiPicker = EmojiMart.Picker;
        Emoji       = EmojiMart.Emoji;

        this.setState({ loading: false });
      }).catch(() => {
        this.setState({ loading: false });
      });
    } else {
      this.setState({ loading: false });
    }
  }

  render () {
    const { intl, skinTone, frequentlyUsedEmojis } = this.props;
    const title = intl.formatMessage(messages.emoji);
    const { loading, modifierOpen } = this.state;

    if (loading) {
      return (
        <CircularProgress size={30} strokeWidth={3.5} />
      );
    }

    return (
      <div className={classNames('reaction-picker__menu', { selecting: modifierOpen })}>
        <EmojiPicker
          perLine={8}
          emojiSize={22}
          color=''
          emoji=''
          title={title}
          i18n={this.getI18n()}
          onClick={this.handleClick}
          recent={frequentlyUsedEmojis}
          skin={skinTone}
          showPreview={false}
          showSkinTones={false}
          skinTonePosition={'search'}
          notFound={notFoundFn}
          autoFocus={this.state.readyToFocus}
          emojiTooltip
          style={{ width: '100%' }}
        />

        <ModifierPicker
          active={modifierOpen}
          modifier={skinTone}
          onOpen={this.handleModifierOpen}
          onClose={this.handleModifierClose}
          onChange={this.handleModifierChange}
        />
      </div>
    );
  }

}

class ReactionPicker extends React.PureComponent {

  static propTypes = {
    frequentlyUsedEmojis: PropTypes.arrayOf(PropTypes.string),
    intl: PropTypes.object.isRequired,
    onPickEmoji: PropTypes.func.isRequired,
    onSkinTone: PropTypes.func.isRequired,
    skinTone: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  render () {
    const { intl, onPickEmoji, onSkinTone, skinTone, frequentlyUsedEmojis, onClose } = this.props;

    return (
      <div className='reaction-picker'>
        <ReactionPickerMenu
          intl={intl}
          onPick={onPickEmoji}
          onSkinTone={onSkinTone}
          skinTone={skinTone}
          frequentlyUsedEmojis={frequentlyUsedEmojis}
          onClose={onClose}
        />
      </div>
    );
  }

}

export default injectIntl(ReactionPicker);