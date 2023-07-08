import { connect } from 'react-redux';
import { reaction, unreaction } from 'mastodon/actions/interactions';
import StatusReactionBar from '../components/status_reaction_bar';
import { createSelector } from 'reselect';
import { Map as ImmutableMap } from 'immutable';

const customEmojiMap = createSelector([state => state.get('custom_emojis')], items => items.reduce((map, emoji) => map.set(emoji.get('shortcode'), emoji), ImmutableMap()));

const mapStateToProps = state => ({
  emojiMap: customEmojiMap(state),
});

const mapDispatchToProps = dispatch => ({
  addReaction: (status, name) => dispatch(reaction(status, name)),
  removeReaction: (status, name) => dispatch(unreaction(status, name)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StatusReactionBar);
