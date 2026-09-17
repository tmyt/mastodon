import { connect } from 'react-redux';

import { reaction, unreaction } from 'mastodon/actions/interactions';

import StatusReactionBar from '../components/status_reaction_bar';

const mapDispatchToProps = dispatch => ({
  addReaction: (status, name) => dispatch(reaction(status, name)),
  removeReaction: (status, name) => dispatch(unreaction(status, name)),
});

export default connect(null, mapDispatchToProps)(StatusReactionBar);
