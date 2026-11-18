/*
 * panel/styles.js — Panel styles. Injected into the panel's shadow root, so TradingView's CSS and ours never mix.
 */
function CSS() {
  return `
:host{all:initial}
*{box-sizing:border-box;font-family:"TJ Archivo",Archivo,system-ui,-apple-system,Segoe UI,sans-serif}
.toast{--bg:#161a2d;--ink:#e6e8f3;--mut:#9299b8;--line:#283050;--acc:#8590ff;--live:#f08c4c;position:fixed;left:50%;transform:translateX(-50%);display:grid;justify-items:center;text-align:center;cursor:pointer;animation:tjin .2s ease-out}
.toast[hidden]{display:none}.toast.p-top{top:14px}.toast.p-mid{top:22%}.toast.p-bot{bottom:60px}
.toast.lg{gap:4px;min-width:300px;padding:20px 32px;background:var(--acc);color:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.5);animation:tjin .2s ease-out,tjpulse 1s ease-in-out .2s 3}
.toast.lg.wk{background:var(--live);box-shadow:0 18px 50px rgba(0,0,0,.5)}
.toast.lg b{font-size:22px;font-weight:600}.toast.lg small{font-size:13px;opacity:.9}.toast.lg em{font-style:normal;font-size:11px;opacity:.75;margin-top:2px}
.toast.sm{gap:2px;padding:10px 20px 10px 16px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-left:4px solid var(--acc);border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.45);justify-items:start;text-align:left}
.toast.sm.wk{border-left-color:var(--live)}.toast.sm b{font-size:14px;font-weight:600}.toast.sm small,.toast.sm em{color:var(--mut);font-size:12px;font-style:normal}
.toast .tbtn{display:flex;gap:6px;margin-top:6px}
.toast .tbtn button{font:inherit;font-size:12.5px;font-weight:600;padding:4px 12px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.16);color:inherit}
.toast .tbtn button:hover{background:rgba(255,255,255,.3)}
.toast.sm .tbtn button{border-color:var(--line);background:var(--in,#0e1120);color:var(--ink)}.toast.sm .tbtn button:hover{border-color:var(--acc)}
@keyframes tjin{from{opacity:0;transform:translate(-50%,-10px) scale(.96)}to{opacity:1;transform:translateX(-50%)}}
@keyframes tjpulse{50%{transform:translateX(-50%) scale(1.06)}}
.panel .f + .chk{margin-top:8px}
.panel hr{border:0;border-top:1px solid var(--line);margin:10px 0;width:100%}
.pill{position:fixed;right:16px;bottom:80px;width:46px;height:46px;border-radius:12px;border:0;padding:0;background:none;cursor:grab;box-shadow:0 6px 20px rgba(0,0,0,.4);touch-action:none;overflow:hidden}.pill:active{cursor:grabbing}.pill img{width:100%;height:100%;display:block;pointer-events:none;user-select:none}
[hidden]{display:none!important}
.panel{--live:#f08c4c;--bg:#161a2d;--in:#0e1120;--ink:#e6e8f3;--mut:#9299b8;--line:#283050;--soft:#1d2238;--good:#43c088;--bad:#f06c60;--acc:#8590ff;width:360px;max-height:calc(100vh - 24px);display:flex;flex-direction:column;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.45);font-size:13px;overflow:hidden}
.head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);cursor:move;user-select:none}
.head b{font-size:14px;white-space:nowrap;flex:none}.who{font-size:12px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.x{margin-left:auto;background:none;border:0;color:var(--mut);font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}.x:hover{background:var(--soft);color:var(--ink)}.x2{margin-left:0}.panel.mini{width:auto;min-width:220px}.panel.mini .head{border-bottom:0}
.body{overflow-y:auto;overflow-x:hidden;padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.login{display:grid;gap:10px}.login p{margin:0;color:var(--mut);line-height:1.45}
.f{display:grid;gap:4px;min-width:0}.f>span{font-size:11px;font-weight:600;color:var(--mut)}.f>span em{font-weight:400;font-style:normal;opacity:.8;margin-left:4px}
.row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}.row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:end}
input,select,textarea{width:100%;font-size:13px;color:var(--ink);background:var(--in);border:1px solid var(--line);border-radius:8px;padding:6px 8px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--acc)}textarea{resize:vertical}
.segs{display:flex;flex-wrap:wrap;gap:4px}
.sg{border:1px solid var(--line);background:var(--in);color:var(--ink);border-radius:8px;padding:4px 8px;font-size:12.5px;cursor:pointer}
.sg.on{background:var(--acc);border-color:var(--acc);color:#fff}.sg.on.pos{background:var(--good);border-color:var(--good)}.sg.on.neg{background:var(--bad);border-color:var(--bad)}
.sec{border:1px solid var(--line);border-radius:8px}
.sh{width:100%;display:flex;align-items:center;gap:8px;background:none;border:0;color:var(--ink);padding:8px 10px;cursor:pointer;text-align:left}
.sh b{font-size:12px;color:var(--mut)}.sh em{font-style:normal;color:var(--ink);font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sh i{font-style:normal;color:var(--mut)}
.sec{min-width:0}.sb{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:2px 10px 10px}
.chips{display:flex;flex-wrap:wrap;gap:4px}
.ms{position:relative}.msbox{min-height:34px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:4px 24px 4px 4px;border:1px solid var(--line);border-radius:8px;background:var(--in);cursor:pointer;position:relative}
.msbox i{position:absolute;right:7px;top:50%;transform:translateY(-50%);font-style:normal;color:var(--mut);font-size:11px}.msph{color:var(--mut);font-size:12.5px;padding:2px 4px}
.mchip{display:inline-flex;align-items:center;gap:4px;border-radius:6px;padding:2px 4px 2px 8px;font-size:12px}.mchip{background:color-mix(in srgb,var(--acc) 16%,transparent);color:var(--ink)}.mchip.for{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}.mchip.against{background:color-mix(in srgb,var(--bad) 16%,transparent);color:var(--bad)}
.mchip button{background:none;border:0;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0 4px}
.mslist{margin-top:4px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px;display:grid;box-shadow:0 10px 30px rgba(0,0,0,.4);max-height:220px;overflow:auto;overscroll-behavior:contain}
.mslist button{background:none;border:0;color:var(--ink);text-align:left;padding:8px 8px;border-radius:6px;font-size:13px;cursor:pointer}.mslist button:hover{background:var(--soft)}.mslist button:disabled{opacity:.4;cursor:default;background:none}
.chip{border:1px solid var(--line);background:var(--in);color:var(--ink);border-radius:999px;padding:4px 8px;font-size:12px;cursor:pointer}
.chip.for{background:color-mix(in srgb,var(--good) 18%,transparent);border-color:var(--good);color:var(--good)}.chip.against{background:color-mix(in srgb,var(--bad) 16%,transparent);border-color:var(--bad);color:var(--bad)}
.hint{margin:0;color:var(--mut);font-size:12px;line-height:1.4}
.shots{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.shot{min-width:0}
.shot{position:relative;display:grid;gap:4px}.shot img,.shot .ph{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:6px;border:1px solid var(--line);background:var(--in)}
.shot.armed .ph,.shot.armed img{border-color:var(--acc)}
.rm{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;cursor:pointer;line-height:1}
.btn .ico{vertical-align:-3px;margin-right:6px}.editl{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;padding:8px 12px;font-size:12px;color:var(--mut);border-bottom:1px solid var(--line)}.editl span{color:var(--ink)}.ask{display:grid;gap:8px;margin:0;padding:12px;border-bottom:1px solid var(--line);background:var(--soft)}.ask p{margin:0;font-size:13px}.ask .fb{display:flex;gap:8px;align-items:center}.btn{border:1px solid var(--line);background:var(--soft);color:var(--ink);border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer}
.btn.sm{padding:4px 8px;font-size:12px}.btn.pri{background:var(--acc);border-color:var(--acc);color:#fff}.btn.ghost{background:none}.btn:disabled{opacity:.6;cursor:default}
.foot{border-top:1px solid var(--line);padding:10px 12px;display:grid;gap:8px}.fb{display:flex;gap:8px;align-items:center}.sp{flex:1}
.lnk{background:none;border:0;color:var(--mut);font-size:12px;cursor:pointer;text-decoration:underline}.lnk.inl{font-size:11px;padding:0;margin-left:6px;color:var(--acc);text-decoration:none}
.posl{display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--in)}.posl span{color:var(--mut);font-weight:600;font-size:11px}.posl b{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.posl .lnk{margin:0}
.fwd{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:6px 8px;border:1px solid var(--acc);border-radius:8px;font-size:12.5px}.fwdgo{justify-self:start}.trl{display:grid;gap:6px}.tr{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:4px 8px;border:1px solid var(--line);border-radius:8px}.tr i{width:14px;height:14px;border-radius:4px;border:1px solid var(--line)}.tr span{flex:1}.tr .grip{flex:none;cursor:grab;color:var(--mut);font-size:13px;letter-spacing:-3px;padding:0 4px 0 0;user-select:none}.tr.drag{opacity:.45}.tr.over-a{box-shadow:inset 0 2px 0 var(--acc)}.tr.over-b{box-shadow:inset 0 -2px 0 var(--acc)}.tr .trn{flex:1;min-width:0;padding:4px 6px;font-size:12.5px;background:transparent;border-color:transparent}.tr .trn:hover,.tr .trn:focus{border-color:var(--line);background:var(--in)}.tr em{font-style:normal;color:var(--mut);font-size:11px}.tr .lnk{font-size:16px;text-decoration:none}
.newt{display:flex;align-items:center;gap:12px}.newt span{display:grid;gap:2px;font-size:13px}.newt small{color:var(--mut);font-size:12px}.fab{width:46px;height:46px;flex:none;border-radius:50%;border:0;background:var(--acc);color:#fff;font-size:30px;line-height:1;font-weight:400;padding:0 0 4px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.4)}.fab:hover{filter:brightness(1.08)}.skip{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px}
.lnk.ext{justify-self:start;color:var(--acc);text-decoration:none;font-weight:600;font-size:12.5px}
.ic{width:13px;height:13px;vertical-align:-2px;margin-right:4px;color:var(--acc)}.btn .ic{flex:none}.mkrow{display:flex}.mkt{display:inline-flex;gap:2px;padding:4px;border:1px solid var(--line);border-radius:8px;background:var(--bg)}.mkt button{border:0;background:none;color:var(--mut);font:600 13px inherit;font-family:inherit;padding:4px 12px;border-radius:6px;cursor:pointer}.mkt button.on{background:var(--ink);color:var(--in)}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-top:-2px}.tab{display:flex;align-items:center;gap:8px;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-1px;color:var(--mut);font:600 14px inherit;font-family:inherit;padding:8px 12px;cursor:pointer}.tab i{width:9px;height:9px;border-radius:50%}.tab.live i{background:var(--live)}.tab.backtest i{background:var(--acc)}.tab.on{color:var(--ink)}.tab.live.on{border-bottom-color:var(--live)}.tab.backtest.on{border-bottom-color:var(--acc)}
.tgw{display:grid;gap:6px;margin-top:4px;padding:8px 8px;border:1px solid var(--line);border-radius:8px;background:color-mix(in srgb,var(--in) 55%,transparent)}.tgl{font-size:11px;font-weight:600;color:var(--mut)}.tgs{display:flex;flex-wrap:wrap;gap:6px}.tg{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:none;color:var(--mut);border-radius:999px;padding:4px 10px 4px 8px;font-size:12px;cursor:pointer}.tg i{width:10px;height:10px;border-radius:4px;opacity:.45}.tg.on{color:var(--ink);border-color:var(--acc);background:color-mix(in srgb,var(--acc) 14%,transparent)}.tg.on i{opacity:1}
 .exr{display:grid;gap:6px;padding:8px;border:1px solid var(--line);border-radius:8px}.exr .row3{grid-template-columns:minmax(0,.8fr) minmax(0,.9fr) minmax(0,1.35fr)}.exr input{min-width:0;width:100%}.exr input[type=date]{padding-left:6px;padding-right:2px;font-size:12px}.exh{display:flex;gap:6px;align-items:flex-end}.exh > .f{flex:1;min-width:0}.exh .lnk{font-size:16px;text-decoration:none}
.ttl{font-size:12px;color:var(--mut)}.sw{display:flex;gap:8px}.swb{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-shadow:inset 0 0 0 2px var(--bg)}.swb.on{border-color:var(--ink)}.chk{display:flex;gap:8px;align-items:flex-start;cursor:pointer;font-size:12.5px;margin-top:4px}.chk input{width:auto;margin-top:2px;accent-color:var(--acc)}.chk small{display:block;color:var(--mut);font-size:11.5px;margin-top:2px}
.btn.big{padding:12px 16px;font-size:14px}.idle{gap:12px}
.msg{margin:0;font-size:12px;color:var(--ink);line-height:1.4}
.stp{display:flex;gap:4px;padding:8px 12px 0}.st{flex:1;min-width:0;border:0;border-bottom:2px solid var(--line);background:none;color:var(--mut);font-size:11px;font-weight:600;padding:4px 2px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st.done{color:var(--ink);border-color:color-mix(in srgb,var(--acc) 45%,transparent)}.st.on{color:var(--ink);border-color:var(--acc)}
.shotrow{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--in);font-size:12px}.shotrow span{flex:1;color:var(--mut)}
.shot.cur img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:6px;border:1px solid var(--line)}
.grl{margin:0;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut);line-height:1.35}.grl>span:last-child{min-width:0}
.grb{flex:none;display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 6px;border-radius:6px;font:600 12px/1 inherit}
.grb.gA{background:color-mix(in srgb,var(--good) 20%,transparent);color:var(--good)}
.grb.gB{background:color-mix(in srgb,#d6a43a 24%,transparent);color:#d6a43a}
.grb.gC{background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad)}`;
}
