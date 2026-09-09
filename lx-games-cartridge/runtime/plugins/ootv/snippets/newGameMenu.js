/**
 * @const {lx.Plugin} $plugin
 * @const {lx.Snippet} $snippet
 */

lx.ml(`
    <lx.Box> @back [_] #fill('black') #opacity(0.5)
    <lx.Box> @menu [1:6:60:60]
        <lx.Box> [_] #fill('black') #opacity(0.7)
        <lx.Box> .ootv-back [_]\
            #streamProportional()
            <lx.Box> @header (height:1)
            <lx.Box> @gamersList (height:4)\
                #streamProportional(indent:'10px', paddingY:'1px', direction: lx.VERTICAL)
            <lx.Box> @buts\
                #gridProportional(cols:2, indent:'10px')
                <lx.Button> @butOk (text:lx.i18n('newGameMenu.start'))
    <lx.Box> @boardsMenu.ootv-back [_] #hide()\
        #streamProportional(indent:'10px')
        <lx.Box> (height:'60px')
            <lx.Rect> [_] #fill('black') #opacity(0.7) #border()
            <lx.Box> [_] (text:lx.i18n('newGameMenu.choseBoard')) #align(lx.CENTER, lx.MIDDLE)
            <lx.Box> (margin:'10px') #align(lx.RIGHT, lx.MIDDLE)
                <lx.Image> @closeBoardsMenu (path: 'close.png') #adapt() #style('cursor', 'pointer')
        <lx.Box>\
            #gridProportional(indent:'20px', cols:3)
            for i < 9:
                <lx.Box> @board #align(lx.CENTER, lx.MIDDLE) #style('cursor', 'pointer')
    <lx.Box> @boardMenu [_] #hide()
        <lx.Box> [_] #fill('black') #style('opacity', '0.5')
        <lx.Box> @boardWrapper .ootv-back [10:10:80:80]
            <lx.Box> [_] #fill('black') #style('opacity', '0.6')
            <lx.Box> .ootv-back [_]\
                #gridProportional(indent:'10px', cols:2)
                <lx.Box> (width:2, text:lx.i18n('newGameMenu.commandTip')) #align(lx.CENTER, lx.MIDDLE)
                <lx.Box> @boardSchemaSlot [::2:10] #align(lx.CENTER, lx.MIDDLE)
                <lx.Button> @boardOk [0:11:1:1] (text: lx.i18n('newGameMenu.ok'))
                <lx.Button> @boardClose [1:11:1:1] (text: lx.i18n(newGameMenu.close))
`);

$snippet.widget.hide();
