window.__ModuleLoader__.load({
  id: '@local/prompt-optimizer',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Namespace this plugin's visible text is registered under. */
    const LOCALE_NS = 'prompt-optimizer'

    /** English dictionary for the plugin's own namespace. */
    const EN = {
      'button.label': 'Optimize prompt',
      'button.title': 'Upgrade prompt',
      'button.busy': 'Optimizing…',
      'button.empty': 'Write a prompt first',
      'button.failed': 'Prompt optimization failed',
      'button.notes': 'Notes',
      'notes.heading': 'Optimization notes',
      'notes.dismiss': 'Dismiss notes',
      'settings.nav': 'Prompt Optimizer',
      'settings.heading': 'Prompt Optimizer settings',
      'settings.notesPanel.label': 'Show the notes panel',
      'settings.notesPanel.description': 'Show the optimization notes panel above the input box after each optimization.',
      'settings.model.mode.label': 'Model used for optimization',
      'settings.model.mode.description': 'Follow the session model, or pin a fixed provider and model for every optimization.',
      'settings.model.speed': 'Tip: a model without a thinking mode returns the rewritten prompt much faster.',
      'settings.model.auto': 'Follow the session model (automatic)',
      'settings.model.fixed': 'Fixed model',
      'settings.model.provider.label': 'Provider',
      'settings.model.provider.placeholder': 'Select a provider',
      'settings.model.model.label': 'Model',
      'settings.model.model.placeholder': 'Select a model',
      'settings.model.incomplete': 'Choose both a provider and a model to pin the fixed route.',
      'settings.model.stale': 'The saved model is no longer offered by this provider; it will still be used as saved.',
      'settings.model.error': 'Model selection is unavailable:',
      'settings.model.unavailable': 'Model selection is unavailable in this DSH version.',
      'settings.model.readonly': 'This profile is read-only; the model selection cannot be saved from here.',
      'settings.model.loading': 'Loading models…',
      'settings.depth.label': 'Optimization depth',
      'settings.depth.description': 'Standard rewrites the draft alone; deep reads the project and asks for acceptance criteria, risks, and verification steps.',
      'settings.depth.standard': 'Standard',
      'settings.depth.deep': 'Deep',
    }

    /** Chinese dictionary for the plugin's own namespace. */
    const ZH = {
      'button.label': '优化提示词',
      'button.title': '升级提示词',
      'button.busy': '优化中…',
      'button.empty': '请先输入提示词',
      'button.failed': '提示词优化失败',
      'button.notes': '说明',
      'notes.heading': '优化说明',
      'notes.dismiss': '关闭说明',
      'settings.nav': '提示词优化',
      'settings.heading': '提示词优化设置',
      'settings.notesPanel.label': '显示优化说明面板',
      'settings.notesPanel.description': '优化完成后，在输入框上方显示优化说明面板。',
      'settings.model.mode.label': '优化所用模型',
      'settings.model.mode.description': '跟随会话模型，或为每次优化固定一个服务商与模型。',
      'settings.model.speed': '提示：选择不带思考模式的大模型，提示词输出更迅速。',
      'settings.model.auto': '跟随会话模型（自动）',
      'settings.model.fixed': '固定模型',
      'settings.model.provider.label': '服务商',
      'settings.model.provider.placeholder': '选择服务商',
      'settings.model.model.label': '模型',
      'settings.model.model.placeholder': '选择模型',
      'settings.model.incomplete': '请同时选择服务商与模型以固定优化路由。',
      'settings.model.stale': '已保存的模型已不在该服务商的列表中，仍将按原值使用。',
      'settings.model.error': '模型选择暂不可用：',
      'settings.model.unavailable': '当前 DSH 版本不支持插件模型配置。',
      'settings.model.readonly': '当前 profile 为只读，无法在此保存模型选择。',
      'settings.model.loading': '正在加载模型…',
      'settings.depth.label': '优化深度',
      'settings.depth.description': '标准仅依据输入内容重写；深度会读取项目上下文，并要求输出验收标准、风险与验证步骤。',
      'settings.depth.standard': '标准',
      'settings.depth.deep': '深度',
    }

    /**
     * The localStorage key the notes-panel visibility preference is stored
     * under, following the client's `dsh.` prefix for origin-scoped persisted
     * keys (the terminal stores its shell choice under `dsh.terminal.shell`).
     * Storing the string `'true'`/`'false'`; an absent key means shown, which
     * keeps the panel's long-standing default behaviour for every user who
     * never opened the settings page.
     */
    const NOTES_VISIBLE_KEY = 'dsh.plugin.prompt-optimizer.notes-panel-visible'

    /**
     * Milliseconds between progress reads while an optimization runs. Each read
     * is one RPC call on the connection, which writes nothing to the session
     * log — unlike a slash-command execution, which would leave a
     * `command/run` + `command/done` pair behind on every tick. This stays
     * slow enough that live streaming looks smooth without flooding the
     * channel.
     */
    const POLL_INTERVAL_MS = 200

    /** Wall-clock ceiling on one streamed optimization, in milliseconds. */
    const STREAM_DEADLINE_MS = 5 * 60 * 1000

    /**
     * Wait for one progress interval. The loop between reads is what turns the
     * Host's buffered run into a live rewrite in the composer.
     * @param {number} ms - how long to wait.
     * @returns {Promise<void>} resolved after the wait.
     */
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    /**
     * Separator the Host's `/optimize` command puts between the optimized
     * prompt and its notes. The command answers with one text body, so the
     * button splits it back apart on this marker.
     */
    const NOTES_SEPARATOR = '\n\n--- notes ---\n'

    /**
     * Fill of the circular control, with its hover step. Yellow carries no
     * counterpart in the host's `--dsw-alias-*` token set, so it is stated as a
     * literal; the value is chosen to read as the same yellow in both themes.
     */
    const ACCENT_FILL = '#facc15'
    const ACCENT_FILL_HOVER = '#eab308'

    /**
     * Ink for the drawn icon. White by request — note that white on the yellow
     * fill measures about 1.5:1, below WCAG's 3:1 floor for non-text graphics,
     * so the bulb reads faintly on the accent rather than crisply.
     */
    const ACCENT_INK = '#ffffff'

    /**
     * The circular button's box. `34px` is the submit button's own size, taken
     * from the host's `.primary` rule (`width:34px; height:34px`), so this
     * control reads as a peer of the send button it sits beside.
     */
    const BUTTON_SIZE = '34px'

    /**
     * A true circle: half of a square box. The host rounds its own button with
     * `border-radius:999px`, which is the same circle while the box stays square
     * but becomes an ellipse as soon as one axis grows. The button below
     * therefore pins both axes, and this states the roundness directly.
     */
    const BUTTON_RADIUS = '50%'

    /** The drawn icon's size in CSS pixels, inside the button's box. */
    const ICON_SIZE = 18

    /**
     * The control's icon: a light bulb with no glow, drawn here rather than
     * loaded.
     *
     * A bundle's browser half has no filesystem access, so no package asset can
     * be read at runtime; the geometry is stated inline. Strokes use
     * `currentColor`, so the bulb takes the button's ink without a second colour
     * to keep in sync.
     *
     * With the glow rays gone the bulb alone must sit centred, so the glass and
     * its stepped socket are placed to leave equal margins top and bottom. The
     * socket's first line starts exactly at the glass's outer edge, so it meets
     * the bulb instead of cutting into it.
     *
     * @returns {object} the React element.
     */
    function OptimizeIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: ICON_SIZE,
          height: ICON_SIZE,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        // The glass. Its stroked outer edge reaches y 3.4 to 15.6.
        h('circle', {
          cx: 12, cy: 9.5, r: 5.1,
          fill: 'none', stroke: 'currentColor', strokeWidth: 2,
        }),
        // The socket, stepped in below the glass.
        h('path', {
          d: 'M10.1 16.6h3.8M10.8 19.4h2.4',
          fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
        }),
      )
    }

    /**
     * The in-progress indicator that replaces the icon while the Host works.
     * Rotation rides the SVG's own animation, so no stylesheet or timer is
     * registered and unmounting the control leaves nothing behind.
     *
     * @returns {object} the React element.
     */
    function OptimizeSpinner() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: ICON_SIZE,
          height: ICON_SIZE,
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h(
          'circle',
          {
            cx: 8, cy: 8, r: 6,
            fill: 'none', stroke: 'currentColor', strokeWidth: 2,
            strokeLinecap: 'round', strokeDasharray: '10 28',
          },
          h('animateTransform', {
            attributeName: 'transform',
            type: 'rotate',
            from: '0 8 8',
            to: '360 8 8',
            dur: '0.9s',
            repeatCount: 'indefinite',
          }),
        ),
      )
    }

    return {
      inject: ['slots', 'locale', 'remote.commands', 'remote', 'remote.settings', 'remote.session'],
      apply(ctx) {
        const locale = ctx.get('locale')
        const bound = locale === undefined ? undefined : locale.bind(LOCALE_NS)

        /**
         * Translate one key of this plugin's namespace.
         *
         * The locale service signals "no such key" by handing back the key
         * itself, which would print raw text like `button.title` in the UI. The
         * built-in dictionary is therefore the fallback for every failure mode —
         * no locale service, an unresolved key, or an empty result — so shipped
         * wording always reaches the control.
         * @param {string} key - the dictionary key.
         * @returns {string} the wording to show.
         */
        const t = (key) => {
          const resolved = bound === undefined ? undefined : bound(key)
          if (typeof resolved === 'string' && resolved.length > 0 && resolved !== key) {
            return resolved
          }
          return EN[key] ?? key
        }

        if (locale !== undefined) {
          // `ctx.effect` INVOKES this callback and keeps whatever it returns as
          // the disposer, so the dictionaries are registered inside it and the
          // returned function tears them down. Disposing from the callback body
          // instead would unregister both on the spot, and every `t()` call
          // would fall back to printing the raw key.
          ctx.effect(() => {
            const disposeEn = locale.register(LOCALE_NS, 'en', EN)
            const disposeZh = locale.register(LOCALE_NS, 'zh', ZH)
            return () => {
              disposeEn()
              disposeZh()
            }
          }, 'prompt-optimizer:locale')
        }

        /**
         * A tiny per-session text channel shared between the button (in the
         * activity seat) and a panel above the composer (in the dock seat).
         * Both are session-scoped, so values are keyed by sessionId to avoid
         * leaking across conversations. The plugin keeps two independent
         * channels — notes and errors — so each panel shows, and dismisses, on
         * its own without the other overwriting it.
         * @param {string} what - the channel name, for log labels.
         * @returns {{store: Map, get: (id: string) => string, set: (id: string, text: string) => void, use: (id: string|undefined) => string}} the channel.
         */
        const makeChannel = (what) => {
          const store = new Map()
          const listeners = new Map()
          const notify = (sessionId) => {
            const fns = listeners.get(sessionId)
            if (fns !== undefined) for (const fn of fns) fn()
          }
          const set = (sessionId, value) => {
            if (value === null || value === undefined) store.delete(sessionId)
            else store.set(sessionId, value)
            notify(sessionId)
          }
          const read = (sessionId) =>
            sessionId === undefined ? undefined : store.get(sessionId)
          const use = (sessionId) => {
            const [, force] = React.useState(0)
            React.useEffect(() => {
              if (sessionId === undefined) return () => {}
              let fns = listeners.get(sessionId)
              if (fns === undefined) {
                fns = new Set()
                listeners.set(sessionId, fns)
              }
              const fn = () => force((x) => x + 1)
              fns.add(fn)
              return () => { fns.delete(fn) }
            }, [sessionId])
            return read(sessionId)
          }
          return { store, read, set, use }
        }

        /**
         * Optimization notes, published when an optimization succeeds. The
         * value is the plain notes text; empty text means no entry.
         */
        const notesChannel = (() => {
          const channel = makeChannel('notes')
          return {
            set: (sessionId, text) => channel.set(sessionId, (text ?? '') === '' ? undefined : text),
            use: (sessionId) => channel.use(sessionId) ?? '',
          }
        })()

        /**
         * Error notices, published when an optimization cannot start or fails
         * partway. The value carries the message and whether it should clear
         * once the user types: the empty-draft notice asks for input, so it
         * does; a failure during a run describes the text still sitting in the
         * composer, so it stays until dismissed or replaced.
         */
        const errorChannel = (() => {
          const channel = makeChannel('error')
          return {
            set: (sessionId, text, clearOnInput = false) =>
              channel.set(sessionId, (text ?? '') === '' ? undefined : { text, clearOnInput }),
            use: (sessionId) => channel.use(sessionId) ?? null,
          }
        })()

        /**
         * The notes-panel visibility preference, read from and written to
         * localStorage so it survives page reloads — the same origin-scoped
         * persistence the client's own features use. It is reactive: the
         * settings page's switch and the notes panel both subscribe, so a
         * toggle applies at once, and the `storage` effect registered below
         * carries a toggle in one window over to the others.
         *
         * Storage is best-effort. When localStorage is unavailable (a host
         * without it, or a private mode that throws on access) the preference
         * still works for the session and every read falls back to the
         * default, shown.
         */
        const notesVisibility = (() => {
          const listeners = new Set()

          /** Read the stored value; anything but the string 'false' means shown. */
          const read = () => {
            try {
              if (typeof localStorage === 'undefined') return true
              const raw = localStorage.getItem(NOTES_VISIBLE_KEY)
              return raw === null || raw === 'true'
            } catch {
              return true
            }
          }
          let value = read()

          const notify = () => {
            for (const fn of listeners) fn()
          }

          return {
            get: () => value,
            set: (visible) => {
              const next = visible !== false
              if (next === value) return
              value = next
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(NOTES_VISIBLE_KEY, next ? 'true' : 'false')
                }
              } catch {
                // Keep the in-memory value even when the write is refused.
              }
              notify()
            },
            /** Re-read from storage; the `storage` listener calls this. */
            resync: () => {
              const next = read()
              if (next === value) return
              value = next
              notify()
            },
            /** Subscribe the calling component to future changes. */
            use: () => {
              const [, force] = React.useState(0)
              React.useEffect(() => {
                const fn = () => force((x) => x + 1)
                listeners.add(fn)
                return () => {
                  listeners.delete(fn)
                }
              }, [])
              return value
            },
          }
        })()

        /**
         * The model-route preference backing the settings picker. It mirrors
         * the plugin's Config (`mode`/`provider`/`model`) through DSH's
         * settings forms: `remote.settings.describe()` reads the live values
         * and revision, and `remote.settings.mutate()` persists each change
         * into the profile through the Host's config editor. The store is
         * module-level like the channels above, so the settings rows, the
         * change handlers, and the remote event watcher all read one value.
         */
        const modelSelection = (() => {
          const listeners = new Set()
          let state = {
            phase: 'idle', // idle | loading | ready | unavailable | error
            error: '',
            groups: [],
            current: { depth: 'standard', mode: 'auto', provider: '', model: '' },
            revision: undefined,
            writable: true,
          }

          /** Read the current snapshot. */
          const get = () => state

          /** Replace the snapshot and wake the subscribers. */
          const set = (next) => {
            state = next
            for (const fn of listeners) fn()
          }

          /**
           * Find one namespace's descriptor in a settings describe answer. The
           * remote bridge answers with a view object — `{ writable, namespaces }`
           * — while the local service answers with the bare row array; both
           * shapes are accepted so the picker survives either bridge.
           * @param {object | undefined} describe - the describe response.
           * @param {string} ns - the namespace id to find.
           * @returns {object | undefined} the descriptor row, when present.
           */
          const describeRow = (describe, ns) => {
            const view = describe?.ok === true ? describe.value : undefined
            const rows = view === undefined
              ? []
              : Array.isArray(view)
                ? view
                : Array.isArray(view.namespaces)
                  ? view.namespaces
                  : []
            return rows.find((row) => row.ns === ns)
          }

          /**
           * Whether the describe answer says the profile accepts edits.
           * @param {object | undefined} describe - the describe response.
           * @returns {boolean} the writability flag (true when unknown).
           */
          const describeWritable = (describe) => {
            const view = describe?.ok === true ? describe.value : undefined
            return view === undefined || Array.isArray(view) ? true : view.writable !== false
          }

          /**
           * Load the provider/model catalog and the saved route in parallel.
           * Without the settings forms (an older Host, or a page without the
           * remote bridge) the picker degrades to session-following with the
           * fixed controls disabled.
           * @param {object | undefined} remoteSettings - the `remote.settings` namespace.
           * @param {object | undefined} remoteSession - the `remote.session` namespace.
           */
          const load = async (remoteSettings, remoteSession) => {
            if (remoteSettings === undefined || remoteSession === undefined) {
              set({ ...get(), phase: 'unavailable', error: '', groups: [], revision: undefined })
              return
            }
            // A refresh triggered by a Host event keeps the settled controls on
            // screen; only the very first load shows the loading state.
            if (get().phase !== 'ready') set({ ...get(), phase: 'loading', error: '' })
            try {
              const [catalog, describe] = await Promise.all([
                remoteSession.modelCatalog(),
                remoteSettings.describe(),
              ])
              const groups = catalog?.ok === true && Array.isArray(catalog.value?.groups)
                ? catalog.value.groups.map((group) => ({
                    id: group.id,
                    name: typeof group.name === 'string' && group.name.length > 0 ? group.name : group.id,
                    models: Array.isArray(group.models)
                      ? group.models.map((model) => ({
                          id: model.id,
                          name: typeof model.name === 'string' && model.name.length > 0 ? model.name : model.id,
                        }))
                      : [],
                  }))
                : []
              const descriptor = describeRow(describe, 'prompt-optimizer')
              const writable = describeWritable(describe)
              if (descriptor === undefined) {
                // The running Host has no settings form for this plugin (it
                // predates the Config): degrade to session-following.
                set({ ...get(), phase: 'unavailable', error: '', groups, revision: undefined, writable })
                return
              }
              const value = descriptor.value ?? {}
              set({
                phase: 'ready',
                error: '',
                groups,
                writable,
                current: {
                  depth: value.depth === 'deep' ? 'deep' : 'standard',
                  mode: value.mode === 'fixed' ? 'fixed' : 'auto',
                  provider: typeof value.provider === 'string' ? value.provider : '',
                  model: typeof value.model === 'string' ? value.model : '',
                },
                revision: typeof descriptor.revision === 'number' ? descriptor.revision : undefined,
              })
            } catch (error) {
              set({ ...get(), phase: 'error', error: error instanceof Error ? error.message : String(error) })
            }
          }

          /**
           * Persist one change to the optimizer settings. All fields travel in
           * one mutate so the profile never holds a half-written value; a
           * revision conflict (another window saved meanwhile) refreshes the
           * describe and retries once.
           * @param {object | undefined} remoteSettings - the `remote.settings` namespace.
           * @param {Partial<{depth: string, mode: string, provider: string, model: string}>} patch - the fields to change.
           */
          const applyChange = async (remoteSettings, patch) => {
            if (remoteSettings === undefined) return
            const before = get()
            const next = { ...before.current, ...patch }
            const ops = [
              { op: 'set', path: ['depth'], value: next.depth },
              { op: 'set', path: ['mode'], value: next.mode },
              { op: 'set', path: ['provider'], value: next.provider },
              { op: 'set', path: ['model'], value: next.model },
            ]
            try {
              let response = await remoteSettings.mutate('prompt-optimizer', ops, before.revision)
              if (!response.ok) {
                const refreshed = await remoteSettings.describe()
                const descriptor = describeRow(refreshed, 'prompt-optimizer')
                if (descriptor === undefined) throw new Error('the saved route is no longer configurable')
                response = await remoteSettings.mutate(
                  'prompt-optimizer',
                  ops,
                  typeof descriptor.revision === 'number' ? descriptor.revision : undefined,
                )
              }
              if (!response.ok) throw new Error(response.error?.message ?? 'the save was rejected')
              set({
                ...get(),
                phase: 'ready',
                error: '',
                current: next,
                revision: typeof response.value?.revision === 'number' ? response.value.revision : before.revision,
              })
            } catch (error) {
              set({ ...get(), phase: 'error', error: error instanceof Error ? error.message : String(error) })
            }
          }

          /** Subscribe one component render to future changes. */
          const use = () => {
            const [, force] = React.useState(0)
            React.useEffect(() => {
              const fn = () => force((x) => x + 1)
              listeners.add(fn)
              return () => {
                listeners.delete(fn)
              }
            }, [])
            return state
          }

          return { get, set, load, applyChange, use }
        })()

        // Cross-window sync: a toggle in one window re-renders the panel in the
        // others. Guarded because the module must also load where the page
        // object exists but carries no listener surface (the render test's
        // window stub), and `null` keys — a wholesale clear() — are ignored so
        // unrelated storage wipes cannot silently flip this panel.
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          ctx.effect(() => {
            const onStorage = (event) => {
              if (event.key !== NOTES_VISIBLE_KEY) return
              notesVisibility.resync()
            }
            window.addEventListener('storage', onStorage)
            return () => window.removeEventListener('storage', onStorage)
          }, 'prompt-optimizer:notes-visibility-storage')
        }

        // Live model-route sync: the settings forms change on the Host (this
        // window's saves and other windows' saves alike) and the model catalog
        // changes when adapters mount or unmount, so the picker refreshes on
        // both events instead of going stale. The remote base is absent in the
        // render test's stub, hence the guard.
        const remote = ctx.get('remote')
        if (remote !== undefined && typeof remote.$on === 'function') {
          ctx.effect(() => {
            const disposers = [
              remote.$on('settings/document-updated', () => {
                void modelSelection.load(ctx.get('remote.settings'), ctx.get('remote.session'))
              }),
              remote.$on('llm/adapters-updated', () => {
                void modelSelection.load(ctx.get('remote.settings'), ctx.get('remote.session'))
              }),
            ]
            return () => {
              for (const dispose of disposers) dispose()
            }
          }, 'prompt-optimizer:model-selection-events')
        }

        /**
         * The shell the two dock panels share: a full-width strip above the
         * composer card, capped to the card's own max-width (the same CSS
         * variable the host's .Q7WfXG_card uses) and centered, so it never
         * reads wider than the input box beneath it, with a close button.
         * @param {object} parts - the per-panel parts.
         * @param {string|null} parts.role - the ARIA role, or null for none.
         * @param {string} parts.color - the text colour.
         * @param {object|null} parts.heading - a heading element, or null.
         * @param {string} parts.text - the body text.
         * @param {string} parts.dismissLabel - the close button's label.
         * @param {() => void} parts.onDismiss - closes this panel's channel.
         * @returns {object} the React element.
         */
        const DockPanelShell = ({ role, color, heading, text, dismissLabel, onDismiss }) =>
          h(
            'div',
            {
              role,
              style: {
                width: '100%',
                maxWidth: 'var(--dsh-composer-card-max-width)',
                marginInline: 'auto',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '16px',
                background: 'var(--dsw-alias-bg-layer-1)',
                border: '1px solid #F6F6F6',
                fontSize: '13px',
                lineHeight: '1.5',
                color,
              },
            },
            h(
              'div',
              { style: { flex: '1', minWidth: 0 } },
              heading,
              h(
                'div',
                { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
                text,
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                onClick: onDismiss,
                'aria-label': dismissLabel,
                title: dismissLabel,
                style: {
                  flex: 'none',
                  boxSizing: 'border-box',
                  width: '24px',
                  height: '24px',
                  minWidth: '24px',
                  minHeight: '24px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-secondary)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: '1',
                  display: 'grid',
                  placeItems: 'center',
                },
              },
              '×',
            ),
          )

        /**
         * The notes panel: one of this plugin's two dock entries. It shows the
         * optimization notes, and it appears only while notes exist for the
         * session and the visibility preference is on. Notes describe the
         * optimized prompt, so they dismiss when the draft is cleared (the
         * user sent the message or deleted the text). The preference gates the
         * whole panel: with it off the channel keeps updating underneath — the
         * auto-dismiss watcher below still runs — so turning it back on shows
         * the latest notes rather than a stale snapshot.
         * @param {object} props - the slot's standard props.
         * @returns {object|null} the React element, or null when there are no notes.
         */
        function NotesPanel(props) {
          const { sessionId, useInput } = props
          const notes = notesChannel.use(sessionId)
          const visible = notesVisibility.use()
          const draft = useInput === undefined ? '' : (useInput((s) => (s === undefined ? '' : s.draft)) ?? '')
          React.useEffect(() => {
            if (notes.length > 0 && draft.trim().length === 0) {
              notesChannel.set(sessionId, '')
            }
          }, [notes, draft, sessionId])
          if (!visible || notes.length === 0) return null
          return h(DockPanelShell, {
            role: 'status',
            color: 'var(--dsw-alias-label-primary)',
            heading: h(
              'div',
              {
                style: {
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-secondary)',
                  marginBottom: '2px',
                },
              },
              t('notes.heading'),
            ),
            text: notes,
            dismissLabel: t('notes.dismiss'),
            onDismiss: () => notesChannel.set(sessionId, ''),
          })
        }

        /**
         * The error panel: this plugin's second dock entry. It shows why an
         * optimization could not start or failed partway. Only a notice that
         * asks for input — the empty-draft one — clears when the user types;
         * a failure during a run describes the text still sitting in the
         * composer, so it stays until dismissed or replaced by the next
         * attempt. It is a separate entry from the notes panel, so neither
         * displaces the other.
         * @param {object} props - the slot's standard props.
         * @returns {object|null} the React element, or null when there is no error.
         */
        function ErrorPanel(props) {
          const { sessionId, useInput } = props
          const entry = errorChannel.use(sessionId)
          const draft = useInput === undefined ? '' : (useInput((s) => (s === undefined ? '' : s.draft)) ?? '')
          React.useEffect(() => {
            if (entry === null) return
            if (entry.clearOnInput && draft.trim().length > 0) {
              errorChannel.set(sessionId, '')
            }
          }, [entry, draft, sessionId])
          if (entry === null) return null
          // The error line is short enough to read as itself and needs no
          // heading above it; it is announced assertively.
          return h(DockPanelShell, {
            role: 'alert',
            color: 'var(--dsw-alias-state-error-primary)',
            heading: null,
            text: entry.text,
            dismissLabel: t('notes.dismiss'),
            onDismiss: () => errorChannel.set(sessionId, ''),
          })
        }

        /**
         * The on/off switch, drawn to the host's own switch geometry with
         * inline styles: a 36×20 capsule track, a 16px thumb shifted 16px when
         * on, and the same alias tokens the host's `.switch` rules use. A
         * bundle's browser half registers no stylesheet, so the on/off state
         * keys off `aria-checked`'s value directly instead of a class.
         * @param {object} parts - the switch parts.
         * @param {boolean} parts.checked - whether the switch is on.
         * @param {string} parts.label - the accessible name, announced with the state.
         * @param {(visible: boolean) => void} parts.onChange - called with the next state.
         * @returns {object} the React element.
         */
        function VisibilitySwitch({ checked, label, onChange }) {
          return h(
            'button',
            {
              type: 'button',
              role: 'switch',
              'aria-checked': checked ? 'true' : 'false',
              'aria-label': label,
              onClick: () => onChange(!checked),
              style: {
                boxSizing: 'border-box',
                flex: '0 0 auto',
                display: 'block',
                width: '36px',
                height: '20px',
                padding: '2px',
                border: 'none',
                borderRadius: '999px',
                background: checked
                  ? 'var(--dsw-alias-brand-primary)'
                  : 'var(--dsw-alias-border-l3)',
                cursor: 'pointer',
                transition: 'background-color 120ms ease',
              },
            },
            h('span', {
              style: {
                display: 'block',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: checked
                  ? 'var(--dsw-alias-label-primary-foreground)'
                  : 'var(--dsw-alias-switch-thumb)',
                transform: checked ? 'translateX(16px)' : 'translateX(0px)',
                transition: 'transform 120ms ease',
              },
            }),
          )
        }

        /**
         * The notes-panel row: the settings page's first real row, drawn to the
         * host's settings-row geometry (`padding:16px 0`, a hairline bottom
         * border, a 14px title). The switch is the row's only interactive
         * control — the row itself stays inert so it cannot swallow the
         * switch's own keyboard focus.
         * @returns {object} the React element.
         */
        function NotesVisibilityRow() {
          const visible = notesVisibility.use()
          return h(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 0',
                borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
              },
            },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '4px',
                  minWidth: 0,
                },
              },
              h(
                'div',
                {
                  style: {
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '22px',
                    color: 'var(--dsw-alias-label-primary)',
                  },
                },
                t('settings.notesPanel.label'),
              ),
              h(
                'div',
                {
                  style: {
                    fontSize: '12px',
                    lineHeight: '20px',
                    color: 'var(--dsw-alias-label-tertiary)',
                  },
                },
                t('settings.notesPanel.description'),
              ),
            ),
            h(VisibilitySwitch, {
              checked: visible,
              label: t('settings.notesPanel.label'),
              onChange: notesVisibility.set,
            }),
          )
        }

        /**
         * The settings page's model-route selection rows. The mode row picks
         * between following the session model and pinning a fixed route; the
         * provider and model rows cascade from the session model catalog. Every
         * change persists at once through the settings forms — no save step,
         * and other windows pick the change up through the document event.
         * @returns {object} the React element.
         */
        function ModelSelectionRows() {
          const state = modelSelection.use()
          const remoteSettings = ctx.get('remote.settings')
          const remoteSession = ctx.get('remote.session')
          const { current, groups, phase, error, writable } = state
          const fixed = current.mode === 'fixed'
          const group = groups.find((candidate) => candidate.id === current.provider)
          const models = group === undefined ? [] : group.models
          const busy = phase === 'idle' || phase === 'loading'
          const locked = phase === 'unavailable' || writable === false

          // The first load happens when the page mounts. Later renders skip it
          // so a re-render cannot clobber a change the user is mid-way through;
          // the document/adapters events below refresh after Host changes.
          React.useEffect(() => {
            if (phase === 'idle') void modelSelection.load(remoteSettings, remoteSession)
          }, [])

          const statusText = locked
            ? t(phase === 'unavailable' ? 'settings.model.unavailable' : 'settings.model.readonly')
            : error.length > 0
              ? `${t('settings.model.error')} ${error}`
              : busy
                ? t('settings.model.loading')
                : fixed && (current.provider.length === 0 || current.model.length === 0)
                  ? t('settings.model.incomplete')
                  : fixed && group !== undefined && models.length > 0 && !models.some((model) => model.id === current.model)
                    ? t('settings.model.stale')
                    : ''

          const selectStyle = {
            boxSizing: 'border-box',
            flex: '0 0 auto',
            width: '240px',
            maxWidth: '240px',
            height: '32px',
            border: '0.5px solid var(--dsw-alias-border-l4)',
            borderRadius: 'var(--dsw-radius-md)',
            background: 'var(--dsw-alias-bg-layer-1)',
            color: 'var(--dsw-alias-label-primary)',
            padding: '0 10px',
            fontSize: '14px',
            lineHeight: '22px',
            cursor: 'pointer',
          }

          const row = (title, description, control) =>
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 0',
                  borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
                },
              },
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '4px',
                    minWidth: 0,
                  },
                },
                h(
                  'div',
                  {
                    style: {
                      fontSize: '14px',
                      lineHeight: '22px',
                      color: 'var(--dsw-alias-label-primary)',
                    },
                  },
                  title,
                ),
                description === undefined
                  ? null
                  : h(
                      'div',
                      {
                        style: {
                          fontSize: '12px',
                          lineHeight: '20px',
                          color: 'var(--dsw-alias-label-tertiary)',
                        },
                      },
                      description,
                    ),
              ),
              control,
            )

          const modeSelect = h(
            'select',
            {
              value: current.mode,
              disabled: locked,
              'aria-label': t('settings.model.mode.label'),
              onChange: (event) => modelSelection.applyChange(remoteSettings, { mode: event.target.value }),
              style: selectStyle,
            },
            h('option', { value: 'auto' }, t('settings.model.auto')),
            h('option', { value: 'fixed' }, t('settings.model.fixed')),
          )

          const providerSelect = h(
            'select',
            {
              value: current.provider,
              disabled: !fixed || groups.length === 0 || locked,
              'aria-label': t('settings.model.provider.label'),
              onChange: (event) => modelSelection.applyChange(remoteSettings, { provider: event.target.value, model: '' }),
              style: selectStyle,
            },
            h('option', { value: '', disabled: true }, t('settings.model.provider.placeholder')),
            ...groups.map((candidate) => h('option', { value: candidate.id }, candidate.name)),
          )

          const modelSelect = h(
            'select',
            {
              value: current.model,
              disabled: !fixed || group === undefined || models.length === 0 || locked,
              'aria-label': t('settings.model.model.label'),
              onChange: (event) => modelSelection.applyChange(remoteSettings, { model: event.target.value }),
              style: selectStyle,
            },
            h('option', { value: '', disabled: true }, t('settings.model.model.placeholder')),
            ...models.map((model) => h('option', { value: model.id }, model.name)),
          )

          /** One position of the two-stop depth toggle. */
          const depthStop = (value, label) =>
            h(
              'button',
              {
                type: 'button',
                role: 'radio',
                'aria-checked': current.depth === value ? 'true' : 'false',
                onClick: () => modelSelection.applyChange(remoteSettings, { depth: value }),
                style: {
                  boxSizing: 'border-box',
                  flex: '0 0 auto',
                  height: '28px',
                  padding: '0 12px',
                  border: 'none',
                  borderRadius: 'var(--dsw-radius-sm)',
                  background: current.depth === value ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                  color: current.depth === value
                    ? 'var(--dsw-alias-label-primary-foreground)'
                    : 'var(--dsw-alias-label-secondary)',
                  fontSize: '13px',
                  lineHeight: '20px',
                  cursor: locked ? 'default' : 'pointer',
                },
              },
              label,
            )

          // The two-position depth toggle: standard rewrites the draft alone,
          // deep grounds it in the project and asks for criteria/risks/checks.
          const depthToggle = h(
            'div',
            {
              role: 'radiogroup',
              'aria-label': t('settings.depth.label'),
              style: {
                boxSizing: 'border-box',
                flex: '0 0 auto',
                display: 'inline-flex',
                gap: '2px',
                padding: '2px',
                border: '0.5px solid var(--dsw-alias-border-l3)',
                borderRadius: 'var(--dsw-radius-md)',
                background: 'var(--dsw-alias-bg-layer-1)',
                opacity: locked ? 0.6 : 1,
              },
            },
            depthStop('standard', t('settings.depth.standard')),
            depthStop('deep', t('settings.depth.deep')),
          )

          return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column' } },
            row(t('settings.depth.label'), t('settings.depth.description'), depthToggle),
            row(t('settings.model.mode.label'), t('settings.model.mode.description'), modeSelect),
            row(t('settings.model.provider.label'), undefined, providerSelect),
            row(t('settings.model.model.label'), undefined, modelSelect),
            // The picked model's speed is the one choice on this page whose
            // effect the user feels before seeing any result, so the tip sits
            // directly under the rows it applies to.
            h(
              'div',
              {
                style: {
                  fontSize: '12px',
                  lineHeight: '20px',
                  padding: '10px 0 2px',
                  color: 'var(--dsw-alias-label-tertiary)',
                },
              },
              t('settings.model.speed'),
            ),
            statusText.length > 0
              ? h(
                  'div',
                  {
                    style: {
                      fontSize: '12px',
                      lineHeight: '18px',
                      padding: '4px 0 12px',
                      color: error.length > 0
                        ? 'var(--dsw-alias-state-error-primary)'
                        : 'var(--dsw-alias-label-tertiary)',
                    },
                  },
                  statusText,
                )
              : null,
          )
        }

        /**
         * The settings page: a section in the settings UI's nav. Its rows
         * subscribe to the preference store directly, so a switch flips the
         * composer's panels on the spot — no save step, no reload.
         * @returns {object} the React element.
         */
        function PromptOptimizerSettings() {
          return h(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                maxWidth: '560px',
                padding: '4px 0 24px',
                color: 'var(--dsw-alias-label-primary)',
              },
            },
            h(
              'div',
              {
                style: {
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--dsw-alias-label-primary)',
                },
              },
              t('settings.heading'),
            ),
            h(ModelSelectionRows),
            h(NotesVisibilityRow),
          )
        }

        /**
         * The composer tool-row control that optimizes the current draft against
         * the project and writes the result back into the composer. It renders as
         * an icon button; its accessible name and hover hint carry the wording.
         * @param {object} props - the slot's standard props.
         * @returns {object} the React element.
         */
        function OptimizePromptControl(props) {
          const { sessionId, useInput, inputActions } = props
          const [state, setState] = React.useState({ phase: 'idle', message: '' })
          const [hover, setHover] = React.useState(false)

          const draft = useInput((s) => (s === undefined ? '' : s.draft)) ?? ''
          const busy = state.phase === 'busy'

          const onClick = React.useCallback(async () => {
            if (busy) return
            const text = (draft ?? '').trim()
            if (text.length === 0) {
              // The empty-draft notice goes to this plugin's error panel above
              // the composer — its own dock entry, independent of the notes
              // panel, so both can be up at once.
              errorChannel.set(sessionId, t('button.empty'), true)
              return
            }
            if (sessionId === undefined) {
              errorChannel.set(sessionId, t('button.failed'))
              return
            }
            setState({ phase: 'busy', message: '' })
            try {
              const commands = ctx.get('remote.commands')
              if (commands === undefined) throw new Error('The Host connection is unavailable.')

              // Streaming path: `/optimize-start` kicks the run off in the
              // background and answers at once with a stream id; the plugin's
              // own Remote namespace (`promptOptimizer/poll`) then reports the
              // rewrite accumulated so far, and each chunk is written into the
              // composer so the prompt grows while the model generates. The
              // progress reads are plain RPC on the connection, so they write
              // nothing to the session transcript — only the single start
              // command does, and that one declares `recordInput: false`.
              //
              // The endpoint is probed with an empty id before the run: an
              // unavailable endpoint answers with an error instead of a view,
              // and the button then takes the blocking path rather than start a
              // run it could not follow.
              // The Gateway claims `promptOptimizer/poll` only when this
              // plugin's Remote service is registered, so one empty-id probe
              // tells the two cases apart: an unclaimed endpoint answers
              // `gateway/invocation-unavailable`, while a claimed one reaches
              // the service and fails with its own code. The probe also
              // absorbs a page whose connection has no RPC surface at all.
              // The Remote carrier takes one envelope shape: the payload must
              // be a single plain-object `args` field whose keys are the
              // Host method's parameter names (`poll(streamId)` → `streamId`).
              // Anything else is rejected before the method runs.
              const connection = ctx.get('connection')
              const progressReader = connection !== undefined && typeof connection.rpc?.call === 'function'
                ? { call: (streamId) => connection.rpc.call('/api', 'promptOptimizer/poll', { args: { streamId } }) }
                : undefined
              let streamable = false
              if (progressReader !== undefined) {
                try {
                  const probe = await progressReader.call('')
                  streamable = probe?.ok === true || (typeof probe?.error?.code === 'string'
                    && probe.error.code !== 'gateway/invocation-unavailable')
                } catch {
                  streamable = false
                }
              }
              if (streamable) {
                const started = await commands.execute(sessionId, `/optimize-start ${text}`, [])
                const startOutcome = started?.ok === true ? started.value?.result : undefined
                if (startOutcome !== undefined && startOutcome.kind === 'success') {
                  let streamId
                  try {
                    streamId = JSON.parse(startOutcome.text ?? '').streamId
                  } catch {
                    throw new Error('the Host did not start an optimization stream')
                  }
                  const deadline = Date.now() + STREAM_DEADLINE_MS
                  let shown = ''
                  for (;;) {
                    if (Date.now() > deadline) throw new Error('the optimization timed out')
                    await sleep(POLL_INTERVAL_MS)
                    const answer = await progressReader.call(streamId)
                    if (answer?.ok !== true) {
                      throw new Error(answer?.error?.message ?? 'the progress read failed')
                    }
                    const view = answer.value
                    if (view === undefined || view === null || typeof view !== 'object') {
                      throw new Error('the Host sent no stream update')
                    }
                    const partial = typeof view.optimized === 'string' ? view.optimized : ''
                    if (partial.length > 0 && partial !== shown && inputActions !== undefined) {
                      shown = partial
                      inputActions.setDraft(shown)
                    }
                    if (view.done !== true) continue
                    if (typeof view.error === 'string' && view.error.length > 0) throw new Error(view.error)
                    if (shown.trim().length === 0) throw new Error('the Host returned an empty prompt')
                    if (inputActions !== undefined) inputActions.persistDraft()
                    notesChannel.set(sessionId, typeof view.notes === 'string' ? view.notes : '')
                    break
                  }
                  setState({ phase: 'idle', message: '' })
                  return
                }
              }

              // Fallback: one blocking command call. This is also the path a
              // Host that predates the stream commands takes, at the cost of
              // waiting for the whole reply before touching the draft.
              const result = await commands.execute(sessionId, `/optimize ${text}`, [])
              if (result === undefined || result.ok !== true) {
                const detail = result !== undefined && result.error !== undefined
                  ? result.error.message
                  : 'the command was rejected'
                throw new Error(detail)
              }
              const outcome = result.value === undefined ? undefined : result.value.result
              if (outcome === undefined) {
                // `value: undefined` is how the command Remote answers for a
                // command the running Host does not know.
                throw new Error('the running Host does not know the optimizer commands — re-enable the plugin in the Plugin Manager or restart DSH')
              }
              if (outcome.kind !== 'success') {
                throw new Error(
                  outcome.text !== undefined ? outcome.text : 'optimization failed',
                )
              }
              const body = outcome.text === undefined ? '' : outcome.text
              const notesAt = body.indexOf(NOTES_SEPARATOR)
              const optimized = notesAt < 0 ? body : body.slice(0, notesAt)
              const notes = notesAt < 0 ? '' : body.slice(notesAt + NOTES_SEPARATOR.length)
              if (optimized.trim().length === 0) throw new Error('the Host returned an empty prompt')
              if (inputActions !== undefined) {
                inputActions.setDraft(optimized)
                inputActions.persistDraft()
              }
              notesChannel.set(sessionId, notes)
              setState({ phase: 'idle', message: '' })
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              // Failures during an optimization run surface in the error panel
              // too. The draft still holds the text that failed, so the message
              // must stay until dismissed or the next attempt replaces it.
              errorChannel.set(sessionId, message)
              setState({ phase: 'idle', message: '' })
            }
          }, [busy, draft, sessionId, inputActions, t])

          return h(
            'div',
            {
              style: {
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '6px',
              },
            },
            h(
              'button',
              {
                type: 'button',
                style: {
                  boxSizing: 'border-box',
                  display: 'grid',
                  placeItems: 'center',
                  // A circle needs a square box, so both axes are pinned, and
                  // min-width/min-height keep the flex row from stretching
                  // either one back out.
                  width: BUTTON_SIZE,
                  height: BUTTON_SIZE,
                  minWidth: BUTTON_SIZE,
                  minHeight: BUTTON_SIZE,
                  aspectRatio: '1 / 1',
                  alignSelf: 'center',
                  flex: 'none',
                  padding: 0,
                  border: 'none',
                  borderRadius: BUTTON_RADIUS,
                  background: hover && !busy ? ACCENT_FILL_HOVER : ACCENT_FILL,
                  color: ACCENT_INK,
                  cursor: busy ? 'progress' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  transition: 'background-color .1s',
                },
                onClick,
                onMouseEnter: () => setHover(true),
                onMouseLeave: () => setHover(false),
                disabled: busy,
                title: t('button.title'),
                'aria-label': busy ? t('button.busy') : t('button.label'),
                'aria-busy': busy ? 'true' : undefined,
              },
              busy ? h(OptimizeSpinner) : h(OptimizeIcon),
            ),
          )
        }

        // The entry takes the toolbar seat the host renders directly before the
        // send button. `conversation.composer.bar` orders the trailing cluster's
        // children as: `standardControls` (the input.right and model seats), then
        // this `conversation.input.activity` seat, then the primary submit
        // action — so an occupant here sits immediately left of send.
        // It is a single seat: one occupant, and its registration catalog is
        // empty, so it takes no id or order. It is unfilled in this build, so
        // nothing shipped is shadowed.
        ctx.slots.inject('conversation.input.activity', () =>
          ctx.slots.register(
            { name: 'conversation.input.activity' },
            OptimizePromptControl,
          ),
        )

        // The two panels take dock entries the host renders as a full-width
        // strip directly above the composer card. The dock is a list seat
        // (additive, no shadowing) whose entries sort by `priority`, then
        // `order`, both ascending — so the LAST entry renders nearest the
        // composer. The built-in occupants sit at priority 0: the todo list at
        // order 0 and the send queue at order 20, and any of them can
        // otherwise squeeze between these panels and the input box. Orders
        // 666 and 999 keep the panels behind every default-order entry, tight
        // against the composer. Notes come first, the error notice under
        // them; each panel renders only while its own channel holds text, so
        // zero, one, or both can be up.
        ctx.slots.inject('conversation.input.dock', () => {
          const disposeNotes = ctx.slots.register(
            { name: 'conversation.input.dock', id: 'prompt-optimizer-notes', order: 666, label: t('notes.heading') },
            NotesPanel,
          )
          const disposeError = ctx.slots.register(
            { name: 'conversation.input.dock', id: 'prompt-optimizer-error', order: 999, label: t('button.failed') },
            ErrorPanel,
          )
          return () => {
            disposeNotes()
            disposeError()
          }
        })

        // The settings page: a section in the settings UI's nav. The slot is a
        // root-scoped list; the nav shows one row per entry, ordered, and the
        // section's component renders only while it is the active one. The
        // label is a function so it re-resolves on locale changes.
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'prompt-optimizer', order: 16, label: () => t('settings.nav') },
            PromptOptimizerSettings,
          ),
        )
      },
    }
  },
})
