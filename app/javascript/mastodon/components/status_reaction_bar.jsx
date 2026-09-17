import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';


import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';

import { useTransition } from '@react-spring/web';
import Overlay from 'react-overlays/Overlay';

import { injectIntl } from '@/mastodon/components/intl';
import { AnimatedNumber } from 'mastodon/components/animated_number';
import { Emoji } from 'mastodon/components/emoji';
import { useEmojiAppState } from 'mastodon/features/emoji/mode';
import { loadEmojiDataToState, stringToEmojiState } from 'mastodon/features/emoji/render';
import { withIdentity } from 'mastodon/identity_context';
import { autoPlayGif, reduceMotion } from 'mastodon/initial_state';

import { Avatar } from './avatar';
import { DisplayName } from './display_name';

// Only custom emoji carry `url`/`static_url`; unicode reactions are rendered by
// the shared `Emoji` component, which resolves them through the emoji database.
class ReactionEmoji extends React.PureComponent {

  static propTypes = {
    emoji: PropTypes.string.isRequired,
    hovered: PropTypes.bool.isRequired,
    domain: PropTypes.string,
    url: PropTypes.string,
    static_url: PropTypes.string,
  };

  render() {
    const { emoji, hovered, domain, url, static_url } = this.props;

    if (!url) {
      return <Emoji code={emoji} />;
    }

    const shortCode = `:${emoji}:`;

    return (
      <img
        draggable='false'
        className='emojione custom-emoji'
        alt={shortCode}
        title={domain ? `:${emoji}@${domain}:` : shortCode}
        src={(autoPlayGif || hovered) ? url : static_url}
        loading='lazy'
        decoding='async'
      />
    );
  }

}

class ReactionButton extends ImmutablePureComponent {

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    signedIn: PropTypes.bool.isRequired,
    reaction: ImmutablePropTypes.map.isRequired,
    addReaction: PropTypes.func.isRequired,
    removeReaction: PropTypes.func.isRequired,
    shortcode: PropTypes.string,
    style: PropTypes.object,
    disabled: PropTypes.bool,
  };

  state = {
    hovered: false,
  };

  handleClick = () => {
    const { reaction, status, addReaction, removeReaction } = this.props;

    const shortCode = reaction.get('name');
    const domain = reaction.get('domain');

    const name = domain ? `${shortCode}@${domain}` : shortCode;

    if (reaction.get('me')) {
      removeReaction(status, name);
    } else {
      addReaction(status, name);
    }
  };

  handleMouseEnter = () => this.setState({ hovered: true });

  handleMouseLeave = () => this.setState({ hovered: false });

  setTargetRef = c => {
    this.target = c;
  };

  findTarget = () => {
    return this.target;
  };

  render() {
    const { reaction, signedIn } = this.props;
    const { hovered } = this.state;

    const name = reaction.get('name');
    const domain = reaction.get('domain');
    let title;

    if (!reaction.get('url')) {
      // Unicode reaction: the shortcode is resolved asynchronously, so fall
      // back to the emoji itself until it arrives.
      title = this.props.shortcode ? `:${this.props.shortcode}:` : name;
    } else if (!domain || name.endsWith(`@${domain}`)) {
      title = `:${name}:`;
    } else {
      title = `${name}@${domain}`;
    }

    return (
      <>
        <span ref={this.setTargetRef} className='status-reaction-bar__wrapper' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <button className={classNames('status-reaction-bar__item', { active: reaction.get('me') })} disabled={!signedIn} onClick={this.handleClick} title={title} style={this.props.style}>
            <span className='status-reaction-bar__item__emoji'><ReactionEmoji hovered={hovered} emoji={reaction.get('name')} domain={reaction.get('domain')} url={reaction.get('url')} static_url={reaction.get('static_url')} /></span>
            <span className='status-reaction-bar__item__count'><AnimatedNumber value={reaction.get('count')} /></span>
          </button>
        </span>
        <Overlay show={hovered} offset={[0, 5]} placement={'top'} flip target={this.findTarget} popperConfig={{ strategy: 'fixed' }}>
          {({ props, placement }) => (
            <div {...props} >
              <div className={`dropdown-animation ${placement}`}>
                <div className='status-reaction-bar__item__users'>
                  <div className='status-reaction-bar__item__users__emoji'>
                    <span><ReactionEmoji hovered={this.state.hovered} emoji={reaction.get('name')} domain={reaction.get('domain')} url={reaction.get('url')} static_url={reaction.get('static_url')} /></span>
                    <span className='status-reaction-bar__item__users__emoji__code'>{title}</span>
                  </div>
                  <div>
                    {reaction.get('users').filter(user => user).map(user => (
                      <span className='status-reaction-bar__item__users__item' key={user.get('acct')}>
                        <Avatar account={user.toJS()} size={24} />
                        <DisplayName account={user} />
                      </span>
                    ))}
                    {reaction.get('count') > 11 && (
                      <span className='status-reaction-bar__item__users__item'>
                        +{reaction.get('count') - 11}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Overlay>
      </>
    );
  }
}

// Unicode reactions used to get their shortcode from the bundled
// `unicodeMapping`; 4.6 keeps shortcodes in the async emoji database instead.
const useReactionShortcode = (reaction) => {
  const name = reaction.get('name');
  const isCustom = !!reaction.get('url');
  const { currentLocale } = useEmojiAppState();
  const [shortcode, setShortcode] = useState(null);

  useEffect(() => {
    if (isCustom) {
      return undefined;
    }

    const state = stringToEmojiState(name);

    if (!state) {
      return undefined;
    }

    let cancelled = false;

    void loadEmojiDataToState(state, currentLocale).then(loaded => {
      if (!cancelled) {
        setShortcode(loaded?.data?.shortcodes?.[0] ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name, isCustom, currentLocale]);

  return shortcode;
};

const Reaction = (props) => {
  const shortcode = useReactionShortcode(props.reaction);

  return <ReactionButton {...props} shortcode={shortcode} />;
};

Reaction.propTypes = {
  reaction: ImmutablePropTypes.map.isRequired,
};

const StatusReactionBar = ({identity, status, addReaction, removeReaction, noMargin}) => {
  const { signedIn } = identity || {};

  const reactions = status.get('reactions');
  const visibleReactions = reactions.filter(x => x.get('count') > 0);

  const items = visibleReactions.map(reaction => ({
    key: reaction.get('name') + '@' + reaction.get('domain'),
    data: reaction,
  })).toArray();

  const transitions = useTransition(items, {
    keys: item => item.key,
    from: { scale: reduceMotion ? 1 : 0 },
    enter: { scale: 1 },
    leave: { scale: 0 },
    config: reduceMotion ? { duration: 0 } : { tension: 150, friction: 13 }
  });

  return (
    <div className={classNames('status-reaction-bar', 
      { 'status-reaction-bar--empty': visibleReactions.isEmpty() },
      { 'status-reaction-bar-no-margin': noMargin })}>
      {transitions((style, item) => (
        <Reaction
          key={item.key}
          reaction={item.data}
          style={{ 
            transform: style.scale.to(s => `scale(${s})`),
            position: style.scale.to(s => s < 0.5 ? 'absolute' : 'static')
          }}
          status={status}
          signedIn={signedIn}
          addReaction={addReaction}
          removeReaction={removeReaction}
        />
      ))}
    </div>
  );
};

export default withIdentity(injectIntl(StatusReactionBar));