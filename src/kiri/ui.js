/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

    if (kiri.ui) return;

    let SELF = self,
        KIRI = self.kiri,
        lastGroup = null,
        lastDiv = null,
        addTo = null,
        hideAction = null,
        inputAction = null,
        groups = {},
        groupShow = {},
        groupName = undefined,
        poppable = {},
        hasModes = [],
        isExpert = [],
        letMode = null,
        letExpert = false,
        DOC = SELF.document,
        state = {},
        prefix = "tab",
        NOMODE = "nomode",
        exitimer = undefined;

    SELF.$ = (SELF.$ || function (id) { return DOC.getElementById(id) } );

    KIRI.ui = {
        prefix: function(pre) { prefix = pre; return kiri.ui },
        hideAction: function(fn) { hideAction = fn; return kiri.ui },
        inputAction: function(fn) { inputAction = fn; return kiri.ui },
        setMode: setMode,
        setExpert: setExpert,
        bound: bound,
        toInt: toInt,
        toFloat: toFloat,
        hidePop: hidePop,
        isPopped: isPopped,
        newText: newTextArea,
        newLabel: newLabel,
        newRange: newRange,
        newInput: newInputField,
        newButton: newButton,
        newBoolean: newBooleanField,
        newSelect: newSelect,
        newTable: newTables,
        newTableRow: newTableRow,
        newRow: newRow,
        newBlank: newBlank,
        newGroup: newGroup,
        setGroup: setGroup,
        hidePoppers: hidePoppers,
        checkpoint,
        restore
    };

    function setMode(mode) {
        Object.keys(groupShow).forEach(group => {
            updateGroupShow(group);
        });
        letMode = mode;
        hasModes.forEach(function(div) {
            div.setMode(div._group && !groupShow[div._group] ? NOMODE : mode);
        });
        hidePoppers();
    }

    function setExpert(bool) {
        letExpert = bool;
        setMode(letMode);
    }

    function checkpoint() {
        return { addTo, lastDiv, lastGroup, groupName };
    }

    function restore(opt) {
        if (opt) {
            addTo = opt.addTo;
            lastDiv = opt.lastDiv;
            lastGroup = opt.lastGroup;
            groupName = opt.groupName;
        }
    }

    // at present only used by the layers popup menu
    function setGroup(div) {
        addTo = lastDiv = div;
        groupName = undefined;
        lastGroup = [];
        return div;
    }

    function newGroup(label, div, options) {
        lastDiv = div || lastDiv;
        return addCollapsableGroup(label, lastDiv, options);
    }

    function addCollapsableGroup(label, div, options) {
        let opt = options || {};
        let group = opt.group || label;
        poppable[group] = opt.inline === true ? false : true;

        let row = DOC.createElement('div'),
            dbkey = `beta-${prefix}-show-${group}`,
            popper = !opt.inline && label,
            link;


        if (popper) {
            let pop = DOC.createElement('div');
            pop.classList.add('set-pop');
            row.appendChild(pop);
            row.setAttribute("class", "set-group noselect");
            addTo = pop;
        } else {
            if (opt.class) {
                opt.class.split(' ').forEach(ce => {
                    row.classList.add(ce);
                });
            } else {
                row.setAttribute("class", "set-header col");
            }
            addTo = lastDiv;
        }

        if (opt.marker) {
            let marker = row.marker = DOC.createElement('div');
            marker.setAttribute('class', 'marker');
            row.appendChild(marker);
        }

        div.appendChild(row);
        if (label) {
            link = DOC.createElement('a');
            link.appendChild(DOC.createTextNode(label));
            row.appendChild(link);
        }
        addModeControls(row, opt);
        lastGroup = groups[group] = [];
        lastGroup.key = dbkey;
        groupName = group;
        groupShow[group] = popper ? state[dbkey] === 'true' : state[dbkey] !== 'false';
        row.onclick = function(ev) {
            if (ev.target !== link && ev.target !== row) {
                return;
            }
            toggleGroup(group, dbkey);
        };
        if (popper) {
            row.onmouseenter = function(ev) {
                if (ev.target !== link && ev.target !== row) {
                    return;
                }
                clearTimeout(exitimer);
                showGroup(group);
            };
            row.onmouseleave = function(ev) {
                if (ev.target !== link && ev.target !== row) {
                    return;
                }
                clearTimeout(exitimer);
                exitimer = setTimeout(showGroup, 1000);
            };
            addTo._group = group;
            addModeControls(addTo, opt);
            lastGroup.push(addTo);
        }

        return row;
    }

    function hidePoppers() {
        showGroup(undefined);
    }

    function showGroup(groupname) {
        Object.keys(groups).forEach(name => {
            let group = groups[name];
            groupShow[name] = state[group.key] = (groupname === name);
            updateGroupShow(name);
        });
    }

    function toggleGroup(groupname, dbkey) {
        let show = state[dbkey] === 'false';
        groupShow[groupname] = poppable[groupname] ? state[dbkey] = show : true;
        updateGroupShow(groupname);
    }

    function updateGroupShow(groupname) {
        let show = groupShow[groupname] || !poppable[groupname];
        let group = groups[groupname];
        group.forEach(div => {
            if (show) div.setMode(letMode);
            else div.setMode(NOMODE);
        });
    }

    function toInt() {
        let nv = this.value !== '' ? parseInt(this.value) : null;
        if (isNaN(nv)) nv = 0;
        if (nv !== null && this.bound) nv = this.bound(nv);
        this.value = nv;
        return nv;
    }

    function toFloat() {
        let nv = this.value !== '' ? parseFloat(this.value) : null;
        if (nv !== null && this.bound) nv = this.bound(nv);
        this.value = nv;
        return nv;
    }

    function bound(low,high) {
        return function(v) {
            if (isNaN(v)) return low;
            return v < low ? low : v > high ? high : v;
        };
    }

    function raw() {
        return this.value !== '' ? this.value : null;
    }

    function newLabel(text) {
        let label = DOC.createElement('label');
        label.appendChild(DOC.createTextNode(text));
        label.setAttribute("class", "noselect");
        return label;
    }

    function addId(el, options) {
        if (options && options.id) {
            el.setAttribute("id", options.id);
        }
    }

    function addModeControls(el, options) {
        options = options || {};
        el.__show = true;
        el.__modeSave = null;
        el.showMe = function() {
            if (el.__show) return;
            el.style.display = el.__modeSave;
            el.__show = true;
            el.__modeSave = null;
        };
        el.hideMe = function() {
            if (!el.__show) return;
            el.__show = false;
            el.__modeSave = el.style.display;
            el.style.display = 'none';
        };
        el.setVisible = function(show) {
            if (show) el.showMe();
            else el.hideMe();
        };
        el.setMode = function(mode) {
            let show = options.expert === undefined || (options.expert === letExpert);
            el.setVisible(el.hasMode(mode) && show);
        }
        el.hasMode = function(mode) {
            if (mode === NOMODE) return false;
            if (!el.modes) return true;
            return el.modes.contains(mode);
        }
        if (options.modes) {
            el.modes = options.modes;
            hasModes.push(el);
        }
    }

    function newDiv(options) {
        let div = DOC.createElement('div');
        addModeControls(div, options);
        addTo.appendChild(div);
        lastGroup.push(div);
        div._group = groupName;
        return div;
    }

    let lastTxt = null;
    let lastPop = null;
    let savePop = null;

    function hidePop() {
        if (lastPop) {
            lastPop.style.display = "none";
        }
        if (savePop) {
            savePop();
            savePop = null;
        }
        lastPop = null;
    }

    function isPopped() {
        return lastPop !== null;
    }

    function newTextArea(label, options) {
        let opt = options || {},
            row = newDiv(options),
            btn = DOC.createElement("button"),
            pop = DOC.createElement("div"),
            txt = DOC.createElement("textarea"),
            area = opt.area;

        txt.setAttribute("wrap", "off");
        txt.setAttribute("spellcheck", "false");
        txt.setAttribute("style", "resize: none");
        txt.onblur = inputAction;

        btn.appendChild(DOC.createTextNode("edit"));

        btn.onclick = function(ev) {
            ev.stopPropagation();
            if (ev.target === txt) {
                // drop clicks on TextArea
                ev.target.focus();
            } else {
                let fc = area.firstChild;
                if (fc) area.removeChild(fc);
                area.appendChild(txt);
                // first time, button click / show
                btn.parentNode.onclick = btn.onclick;
                txt.scrollTop = 0;
                txt.scrollLeft = 0;
                txt.selectionEnd = 0;
                let rows = txt.value.split('\n');
                let cols = 0;
                rows.forEach(row => {
                    cols = Math.max(cols, row.length);
                });
                txt.setAttribute("cols", Math.max(30, cols + 1));
                txt.setAttribute("rows", Math.max(10, rows.length + 1));

                let showing = pop === lastPop;
                hidePop();
                if (!showing) {
                    if (lastTxt) {
                        lastTxt.classList.remove('txt-sel');
                    }
                    row.classList.add('txt-sel');
                    savePop = inputAction;
                    pop.style.display = "flex";
                    lastPop = pop;
                    lastTxt = row;
                    txt.focus();
                } else {
                    inputAction();
                }
            }
        };

        addModeControls(btn, opt);
        addId(btn, opt);

        row.appendChild(newLabel(label));
        row.appendChild(btn);
        row.setAttribute("class", "var-row");
        if (opt.title) row.setAttribute("title", options.title);
        btn.setVisible = row.setVisible;

        return txt;
    }

    function newInputField(label, options) {
        let opt = options || {},
            row = newDiv(opt),
            hide = opt && opt.hide,
            size = opt ? opt.size || 5 : 5,
            height = opt ? opt.height : 0,
            ip = height > 1 ? DOC.createElement('textarea') : DOC.createElement('input'),
            action = opt.action || inputAction;

        row.appendChild(newLabel(label));
        row.appendChild(ip);
        row.setAttribute("class", "var-row");
        if (height > 1) {
            ip.setAttribute("cols", size);
            ip.setAttribute("rows", height);
            ip.setAttribute("wrap", "off");
        } else {
            if (Number.isInteger(size)) {
                ip.setAttribute("size", size);
            } else {
                ip.setAttribute("style", `width:${size}`);
            }
        }
        ip.setAttribute("type", "text");
        ip.setAttribute("spellcheck", "false");
        row.style.display = hide ? 'none' : '';
        if (opt) {
            if (opt.disabled) ip.setAttribute("disabled", "true");
            if (opt.title) row.setAttribute("title", opt.title);
            if (opt.convert) ip.convert = opt.convert.bind(ip);
            if (opt.bound) ip.bound = opt.bound;
            if (opt.action) action = opt.action;
        }
        ip.addEventListener('focus', function(event) {
            hidePop();
        });
        if (action) {
            ip.addEventListener('keydown', function(event) {
                let key = event.key;
                if (
                    opt.text ||
                    (key >= '0' && key <= '9') ||
                    key === '.' ||
                    key === '-' ||
                    key === 'Backspace' ||
                    key === 'Delete' ||
                    key === 'ArrowLeft' ||
                    key === 'ArrowRight' ||
                    key === 'Tab' ||
                    event.metaKey ||
                    event.ctrlKey ||
                    (key === ',' && options.comma)
                ) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
            });
            ip.addEventListener('keyup', function(event) {
                if (event.keyCode === 13) {
                    // action(event);
                    ip.blur();
                }
            });
            ip.addEventListener('blur', function(event) {
                action(event);
            });
        }
        if (!ip.convert) ip.convert = raw.bind(ip);
        ip.setVisible = row.setVisible;

        return ip;
    }

    function newRange(label, options) {
        let row = newDiv(options),
            ip = DOC.createElement('input'),
            hide = options && options.hide,
            action = inputAction;

        if (label) row.appendChild(newLabel(label));
        row.appendChild(ip);
        row.setAttribute("class", "var-row");
        ip.setAttribute("type", "range");
        ip.setAttribute("min", (options && options.min ? options.min : 0));
        ip.setAttribute("max", (options && options.max ? options.max : 100));
        ip.setAttribute("value", 0);
        row.style.display = hide ? 'none' : '';
        if (options) {
            if (options.title) {
                ip.setAttribute("title", options.title);
                row.setAttribute("title", options.title);
            }
            if (options.action) action = options.action;
        }
        ip.setVisible = row.setVisible;

        return ip;
    }

    function newSelect(label, options, source) {
        let row = newDiv(options),
            ip = DOC.createElement('select'),
            hide = options && options.hide,
            action = inputAction;

        row.appendChild(newLabel(label));
        row.appendChild(ip);
        row.setAttribute("source", source || "tools");
        row.setAttribute("class", "var-row");
        row.style.display = hide ? 'none' : '';
        if (options) {
            if (options.convert) ip.convert = options.convert.bind(ip);
            if (options.disabled) ip.setAttribute("disabled", "true");
            if (options.title) row.setAttribute("title", options.title);
            if (options.action) action = options.action;
        }
        ip.onchange = function() { action() };
        ip.setVisible = row.setVisible;

        return ip;
    }

    function newBooleanField(label, action, options) {
        let row = newDiv(options),
            ip = DOC.createElement('input'),
            hide = options && options.hide;

        if (label) {
            row.appendChild(newLabel(label));
        }
        row.appendChild(ip);
        row.setAttribute("class", "var-row");
        row.style.display = hide ? 'none' : '';
        ip.setAttribute("type", "checkbox");
        ip.checked = false;
        if (options) {
            if (options.disabled) ip.setAttribute("disabled", "true");
            if (options.title) {
                ip.setAttribute("title", options.title);
                row.setAttribute("title", options.title);
            }
        }
        if (action) ip.onclick = function() { action() };
        ip.setVisible = row.setVisible;

        return ip;
    }

    function newBlank(options) {
        let row = newDiv(options),
            hide = options && options.hide;

        row.setAttribute("class", "var-row");
        row.style.display = hide ? 'none' : '';
        ip.setVisible = row.setVisible;

        return ip;
    }

    function newButton(label, action, options) {
        let opt = options || {},
            b = DOC.createElement('button');

        b.onclick = function() {
            hidePoppers();
            if (action) action();
        };

        if (opt.class) {
            opt.class.split(' ').forEach(ce => {
                b.classList.add(ce);
            });
        }
        if (opt.icon) {
            let d = DOC.createElement('div');
            d.innerHTML = opt.icon;
            b.appendChild(d);
        }
        if (label) {
            b.appendChild(DOC.createTextNode(label));
        }

        addModeControls(b, options);
        addId(b, options);

        return b;
    }

    function newTableRow(arrayOfArrays, options) {
        return newRow(newTables(arrayOfArrays), options);
    }

    function newTables(arrayOfArrays) {
        let array = [];
        for (let i=0; i<arrayOfArrays.length; i++) {
            array.push(newRowTable(arrayOfArrays[i]));
        }
        return array;
    }

    function newRowTable(array) {
        let div = newDiv();
        div.setAttribute("class", "table-row");
        array.forEach(function(c) {
            div.appendChild(c);
        });
        return div;
    }

    function newRow(children, options) {
        let row = addCollapsableElement((options && options.noadd) ? null : addTo);
        if (children) children.forEach(function (c) { row.appendChild(c) });
        addModeControls(row, options);
        if (options && options.class) {
            options.class.split(' ').forEach(ce => {
                row.classList.add(ce);
            });
        }
        return row;
    }

    function addCollapsableElement(parent) {
        let row = newDiv();
        if (parent) parent.appendChild(row);
        if (lastGroup) lastGroup.push(row);
        return row;
    }

})();
