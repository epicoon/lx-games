/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Snippet} $snippet
 */

lx.ml(`
<lx.Box> @main.lobby-app [_]
	// GuiNode - GuiTopbar: brand, language switcher, auth slot
	<lx.Box> @topbar.lobby-topbar
		<lx.Box> .lobby-brand
			<lx.Box> .lobby-logo 'lx'
			<lx.Box> 'lx-games'
		<lx.Box> .lobby-topbar-right
			<lx.LanguageSwitcher> (size:['64px','30px'], style:{position:'relative'})
			<lx.Box> @authSlot

	// Tab strip: the lobby itself is the first, permanent tab; a game
	// launched from it opens as another tab
	<lx.Box> @tabStrip.lobby-tabstrip

	// Workspace: holds one pane per open tab: the lobby's own (rail, room
	// list, game detail) plus one per opened game, only the active one shown
	<lx.Box> @workspace.lobby-workspace
		<lx.Box> @lobbyPane.lobby-body

			// GuiNode - GuiRail
			<lx.Box> @rail.lobby-rail
				<lx.Box> @railList.lobby-rail-list
					<lx.Box> .lobby-rail-head (text: lx.i18n(lobby.games))
					<lx.Box> @railStream
					<lx.Box> .lobby-rail-soon (text: lx.i18n(lobby.moreGames))
				<lx.Box> .lobby-rail-footer '© 2026 lx-games'

			// GuiNode - GuiCenter
			<lx.Box> @center.lobby-center
				<lx.Box> @roomsHead.lobby-rooms-head
					<lx.Box> @roomsTitle.lobby-rooms-title (text: lx.i18n(lobby.tables))
					<lx.Box> .lobby-live
						<lx.Box> .lobby-dot
						<lx.Box> (text: lx.i18n(lobby.live))
					<lx.Box> .lobby-chips
						<lx.Box> @chipAny.lobby-chip.lobby-chip-active (text: lx.i18n(lobby.filterAny))
						<lx.Box> @chipWaiting.lobby-chip (text: lx.i18n(lobby.filterWaiting))
						<lx.Box> @chipFull.lobby-chip (text: lx.i18n(lobby.filterFull))
						<lx.Box> @chipPlaying.lobby-chip (text: lx.i18n(lobby.filterPlaying))
				<lx.Box> @roomsList.lobby-rooms-list
					<lx.Box> @roomsEmpty.lobby-empty
						<lx.Box> .lobby-empty-title (text: lx.i18n(lobby.noRooms))
						<lx.Box> (text: lx.i18n(lobby.noRoomsHint))
						<lx.Box> @roomsEmptyCreate.lobby-btn.lobby-btn-primary (text: lx.i18n(lobby.createRoom), style:{marginTop:'14px'})
					<lx.Box> @roomsStream

			// GuiNode - GuiDetail
			<lx.Box> @detail.lobby-detail
				<lx.Box> @detailCover.lobby-detail-cover
				<lx.Box> .lobby-detail-body
					<lx.Box> .lobby-detail-title [f:title]
					<lx.Box> .lobby-tags
						<lx.Box> @detailOnlineTag.lobby-tag (text: lx.i18n(lobby.online))
						<lx.Box> @detailOfflineTag.lobby-tag (text: lx.i18n(lobby.offline))
					<lx.Box> .lobby-detail-text [f:description]
					<lx.Box> .lobby-stats
						<lx.Box> .lobby-stat
							<lx.Box> @detailPlayers.lobby-stat-value
							<lx.Box> .lobby-stat-label (text: lx.i18n(lobby.players))
						<lx.Box> .lobby-stat
							<lx.Box> .lobby-stat-value [f:durationMinutes]
							<lx.Box> .lobby-stat-label (text: lx.i18n(lobby.min))
						<lx.Box> .lobby-stat
							<lx.Box> .lobby-stat-value [f:waitingCount]
							<lx.Box> .lobby-stat-label (text: lx.i18n(lobby.filterWaiting))
					<lx.Box> .lobby-actions
						<lx.Box> @detailCreateBtn.lobby-btn.lobby-btn-primary.lobby-btn-full (text: lx.i18n(lobby.createRoom))
						<lx.Box> @detailOfflineBtn.lobby-btn.lobby-btn-full (text: lx.i18n(lobby.playOffline))
					<lx.Box> @detailNote.lobby-note
						<lx.Box> 'ⓘ'
						<lx.Box> (text: lx.i18n(lobby.needAuth))

	// Modals mount here
	<lx.Box> @modalRoot [0:0:100:0]
`);
