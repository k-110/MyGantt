//**************************
// Copyright (c) 2021 k-110
// See https://opensource.org/licenses/MIT
//**************************


//**************************
// For Date
//**************************
// dateFormat
function dateFormat(date){
  let format_str = 'YYYY-MM-DD';
  format_str = format_str.replace(/YYYY/g, date.getFullYear());
  format_str = format_str.replace(/MM/g, ('00'+(1+date.getMonth())).slice(-2));
  format_str = format_str.replace(/DD/g, ('00'+(date.getDate())).slice(-2));
  return format_str;
}

// dateAddDays
function dateAddDays(date_base, days){
  date = new Date(dateFormat(date_base));
  date.setDate(date.getDate() + Number(days));
  return date;
}

// dateCalsDays
function dateCalsDays(date_strt, date_end){
  let st = new Date(dateFormat(date_strt));
  let en = new Date(dateFormat(date_end));
  days = (en - st)/86400000;
  return (days +1);
}


//**************************
// For Dragge
//**************************
var MyGanttDraggableItem = {
  'offsetX' : 0,
  'offsetY' : 0,
  'baseX'   : 0,
  'baseW'   : 0,
  'baseP'   : 0,
  'dragElem': null,
  'rlenElem': null,
  'lrenElem': null,
  'edgeElem': null,
  'xbarElem': null,
  'ybarElem': null,
  'parent'  : null
};


//**************************
// MyGantt
//**************************
class MyGantt{
  constructor(tasks, div_id, svg_id, config){
    this.tasks = tasks;
    for(let i=0; i<this.tasks.length; i++){
      if(delete tasks[i].id){
        delete tasks[i].id;
      }
    }
    this.div_id = div_id;
    this.svg_id = svg_id;
    this.cmd_id = svg_id + '_MyGantt_command';
    this.tsk_id = svg_id + '_MyGantt_tasks';
    this.cal_id = svg_id + '_MyGantt_calendar';
    this.bar_id = svg_id + '_MyGantt_bar';
    this.xsc_id = svg_id + '_MyGantt_xscroll';
    this.ysc_id = svg_id + '_MyGantt_yscroll';
    this.config = {
      'onclick'    : (task) => {},
      'onchange'   : (task) => {},
      'height'     : 200,
      'range'      : 'Day',
      'holiday'    : [],
      'events'     : [],
      'complete'   : false,
      'text'       : false,
      'taskbg'     : false,
      'start_mask' : '',
      'end_mask'   : '',
      'key_mask'   : '',
      'xpos'       : -1,
      'ypos'       : 0
    };
    if(config.onclick)   { this.config.onclick    = config.onclick; }
    if(config.onchange)  { this.config.onchange   = config.onchange; }
    if(config.height)    { this.config.height     = config.height; }
    if(config.range)     { this.config.range      = config.range; }
    if(config.holiday)   { this.config.holiday    = config.holiday; }
    if(config.events)    { this.config.events     = config.events; }
    if(config.complete)  { this.config.complete   = config.complete; }
    if(config.text)      { this.config.text       = config.text; }
    if(config.taskbg)    { this.config.taskbg     = config.taskbg; }
    if(config.start_mask){ this.config.start_mask = config.start_mask; }
    if(config.end_mask)  { this.config.end_mask   = config.end_mask; }
    if(config.key_mask)  { this.config.key_mask   = config.key_mask; }
    MyGanttDraggableItem.dragElem = null;
    MyGanttDraggableItem.parent   = this;
    this.select  = '';
    this.close   = 9;
    this.movebef = '';
    this.movenow = '';
    this.history = dateFormat(new Date()) + ' Start';
    this.record  = 8;
  }

  //------------------------
  // history
  //------------------------
  readHistory(){
    return this.history;
  }

  writeHistory(record){
    this.history += '\n' + dateFormat(new Date()) + ' ' + record;
    let record_list = this.history.match(/\r\n|\n/g);
    if((this.record -1) < record_list.length){
      // Only this.record -1 lines can be recorded.
      let firstLF_pos = this.history.indexOf('\n', 0);
      this.history = this.history.substr(firstLF_pos + 1);
    }
  }

  //------------------------
  // tasks
  //------------------------
  getTasks(){
    return this.tasks;
  }

  upTask(name){
    let index = this.tasks.findIndex((t) => t.name === name);
    if(0 < index){
      let tmp = this.tasks[index];
      this.tasks[index]   = this.tasks[index-1];
      this.tasks[index-1] = tmp;
      this.drawGantt();
    }
  }

  downTask(name){
    let index = this.tasks.findIndex((t) => t.name === name);
    if(index < (this.tasks.length -1)){
      let tmp = this.tasks[index];
      this.tasks[index]   = this.tasks[index+1];
      this.tasks[index+1] = tmp;
      this.drawGantt();
    }
  }

  updateTask(name, task){
    let index = this.tasks.findIndex((t) => t.name === name);
    if((0 <= index) && this.isEnableName(name, task.name) && this.isEnableDependencies(name, task.name, task.dependencies)){
      this.removeArrow(this.tasks[index]);
      if(task.name)        { this.tasks[index].name         = task.name; }
      if(task.layer)       { this.tasks[index].layer        = task.layer; }
      if(task.start)       { this.tasks[index].start        = task.start; }
      if(task.days)        { this.tasks[index].days         = task.days; }
      if(task.progress)    { this.tasks[index].progress     = task.progress; }
      if(task.dependencies){ this.tasks[index].dependencies = task.dependencies; }
      if(task.custom_class){ this.tasks[index].custom_class = task.custom_class; }
                       else{ this.tasks[index].custom_class = '' }
      if(task.sameline)    { this.tasks[index].sameline     = task.sameline; }
      if(name != task.name){
        for(let i=0; i<this.tasks.length; i++){
          if(this.tasks[i].dependencies){
            this.tasks[i].dependencies = this.changeDependencies(name, task.name, this.tasks[i].dependencies);
          }
        }
      }
      this.writeHistory('updateTask ' + name + ' > ' + task.name)
      let tasks = [this.tasks[index]];
      if(this.isNeedReview(tasks)){
        this.drawGantt();
      }
      else{
        this.changeTaksEleElementId(name, this.tasks[index].name);
        this.addArrow(this.tasks[index]);
        this.drawGanttTasks(this.tasks[index]);
        this.writeHistory('drawGanttTask');
      }
      this.config.onchange(this.tasks[index]);
    }
  }

  isChagenTask(base, name, layer, start, days, progress){
    let index = this.tasks.findIndex((t) => t.name === base);
    if(0 <= index){
      if(this.tasks[index].name     !== name){ return true; }
      if(this.tasks[index].layer    !== layer){ return true; }
      if(this.tasks[index].start    !== start){ return true; }
      if(this.tasks[index].days     !== days){ return true; }
      if(this.tasks[index].progress !== progress){ return true; }
    }
    return false;
  }

  addTask(task, next=''){
    let new_task = {
      'name'        : '??????' + Date.now().toString(),
      'layer'       : 1,
      'progress'    : 0,
      'dependencies': [],
      'start'       : dateFormat(new Date()),
      'days'        : 5,
      'close'       : 0,
      'custom_class': ''
    };
    if(task.name){
      if(this.isEnableName(null, task.name)){
        new_task.name = task.name;
      }
    }
    if(task.layer)       { new_task.layer        = task.layer; }
    if(task.start)       { new_task.start        = task.start; }
    if(task.days)        { new_task.days         = task.days; }
    //if(task.progress)    { new_task.progress     = task.progress; }
    if(task.dependencies){ new_task.dependencies = task.dependencies; }
    if(task.custom_class){ new_task.custom_class = task.custom_class; }
                     else{ new_task.custom_class = '' }
    if(this.isEnableName(null, new_task.name) && this.isEnableDependencies(null, new_task.name, new_task.dependencies)){
      if(0 < next.length){
        let index = this.tasks.findIndex((t) => t.name === next);
        if(0 <= index){
          this.tasks.splice(index+1, 0, new_task);
        }
        else{
          this.tasks.push(new_task);
        }
      }
      else{
        this.tasks.push(new_task);
        this.config.ypos = -1;
      }
      this.writeHistory('addTask ' + new_task.name);
      this.drawGantt();
      this.config.onchange(new_task);
    }
  }

  deleteTask(name){
    let index = this.tasks.findIndex((t) => t.name === name);
    if(0 <= index){
      for(let i=0; i<this.tasks.length; i++){
        if(this.tasks[i].dependencies){
          this.tasks[i].dependencies = this.changeDependencies(name, null, this.tasks[i].dependencies);
        }
      }
      this.tasks.splice(index, 1);
      this.writeHistory('deleteTask ' + name)
      this.drawGantt();
    }
  }

  isEnableName(name, new_name){
    let count = 0;
    if(name === new_name){
      return true;
    }
    else if(1 > new_name.length){
      return false;
    }
    for(let i=0; i<this.tasks.length; i++){
      if(new_name === this.tasks[i].name){
        count++;
      }
    }
    return (1 > count);
  }

  isEnableDependencies(name, new_name, dependencies){
    for(let j=0; j<dependencies.length; j++){
      if((dependencies[j] === name) || (dependencies[j] === new_name)){
        return false;
      }
      if(0 > this.tasks.findIndex((t) => t.name === dependencies[j])){
        return false;
      }
    }
    return true;
  }

  changeDependencies(name, new_name, dependencies){
    try{
      for(let i=0; i<dependencies.length; i++){
        if(dependencies[i] === name){
          if(new_name){
             dependencies[i] = new_name;
          }
          else{
            dependencies.splice(i, 1);
          }
          break;
        }
      }
    }
    catch(e){
        document.write(e);
    }
    return dependencies
  }

  textToArray(text){
    let array = [];
    if(text){
      if(0 < text.length){
        let deplist = text.split(',');
        for(let i=0; i<deplist.length; i++){
          let name = deplist[i].trim();
          if(0 < name.length){
            array.push(name);
          }
        }
      }
    }
    return array;
  }

  //------------------------
  // Simple edit
  //------------------------
  getSimpleText(){
    let text = '';
    if(0 < this.tasks.length){
      text = this.taskToSimpleText(this.tasks[0]);
      for(let i=1; i<this.tasks.length; i++){
        text += '\n' + this.taskToSimpleText(this.tasks[i]);
      }
    }
    return text;
  }

  addSimpleText(name, text){
    let index = this.tasks.length;
    if(0 < name.length){
      index = this.tasks.findIndex((t) => t.name === name) +1;
      if(index < 1){
        index = this.tasks.length;
      }
    }
    let lines = text.replace('\r', '').split('\n');
    for(let i=0; i<lines.length; i++){
      let new_task = this.simpleteTextToNewTask(lines[i]);
      if(new_task != null){
        this.tasks.splice(index, 0, new_task);
        index++;
      }
    }
    this.drawGantt();
  }

  renameSimpleText(text){
    let lines = text.replace('\r', '').split('\n');
    if(lines.length != this.tasks.length){
      return;
    }
    for(let i=0; i<lines.length; i++){
      let simpleTask = this.getLayerAndName(lines[i]);
      if(simpleTask != null){
        this.writeHistory(simpleTask);
        if(this.isEnableName(this.tasks[i].name, simpleTask.name) && (this.tasks[i].layer == simpleTask.layer)){
          for(let j=0; j<this.tasks.length; j++){
            if(this.tasks[j].dependencies){
              this.tasks[j].dependencies = this.changeDependencies(this.tasks[i].name, simpleTask.name, this.tasks[j].dependencies);
            }
          }
          this.tasks[i].name = simpleTask.name;
        }
      }
    }
    this.writeHistory('renameSimpleText5');
    this.drawGantt();
  }

  applySimpleText(text){
    let lines = text.replace('\r', '').split('\n');
    let new_tasks = []
    for(let i=0; i<lines.length; i++){
      let new_task = this.simpleteTextToTask(lines[i]);
      if(new_task != null){
        new_tasks.push(new_task);
      }
    }
    this.tasks = new_tasks;
    this.drawGantt();
  }

  taskToSimpleText(task){
    let layer = '';
    for(let i=1; i < task.layer; i++){
      layer += '*';
    }
    if(1 < task.layer){
      layer += ' ';
    }
    let text = layer + task.name;
    return text;
  }

  simpleteTextToNewTask(text){
    let simpleTask = this.getLayerAndName(text);
    if(simpleTask != null){
      let task = this.tasks.find((t) => t.name === simpleTask.name);
      if(task == null){
        let new_task = {
          'name'        : simpleTask.name,
          'layer'       : simpleTask.layer,
          'progress'    : 0,
          'dependencies': [],
          'start'       : dateFormat(new Date()),
          'days'        : 5,
          'close'       : 0,
          'custom_class': ''
        };
        return new_task;
      }
    }
    return null;
  }

  simpleteTextToTask(text){
    let simpleTask = this.getLayerAndName(text);
    if(simpleTask != null){
      let task = this.tasks.find((t) => t.name === simpleTask.name);
      if(task != null){
        task.layer = simpleTask.layer;
        return task;
      }
    }
    return null;
  }

  getLayerAndName(text){
    let layer = 1;
    let name  = '';
    for(let i=0; i < text.length; i++){
      if(text.charAt(i) === '*'){
        layer++;
        continue;
      }
      break;
    }
    name = text.slice(layer-1).trim();
    if(0 < name.length){
      let simpleTask = {
        'name'  : name,
        'layer' : layer,
      };
      return simpleTask;
    }
    return null;
  }

  //------------------------
  // draw
  //------------------------
  drawGantt(range=this.config.range){
    if(this.config.range != range){
      this.config.xpos = -1;
    }
    this.config.range = range;
    let gantt= document.getElementById(this.svg_id);
    let svg  = SVG.adopt(gantt);
    svg.clear();
    this.log = 1;
    this.clearCloseWrok();
    this.setConfig(svg, this.tasks);
    this.createFrame(svg);
    this.drowGroupCmd();
    this.drowGroupTsk();
    this.drowGroupCal();
    this.drowGroupBar();
    this.drowGroupXsc();
    this.drowGroupYsc();
    this.setPositionAndSize();
    this.writeHistory('drawGantt');
  }

  changeTaksEleElementId(name, new_name){
    let elem_rect  = document.getElementById('gantt_label_rect_' + name);
    let elem_text  = document.getElementById('gantt_label_' + name);
    let elem_event = document.getElementById(name);
    let elem_bar   = document.getElementById('gantt_bar_' + name);
    let elem_prog  = document.getElementById('gantt_progress_' + name);
    let elem_label = document.getElementById('gantt_label_bar_' + name);
    if(elem_rect){
      elem_rect.setAttribute('id', 'gantt_label_rect_' + new_name);
    }
    if(elem_text){
      elem_text.setAttribute('id', 'gantt_label_' + new_name);
    }
    if(elem_event){
      elem_event.setAttribute('id', new_name);
    }
    if(elem_bar){
      elem_bar.setAttribute('id', 'gantt_bar_' + new_name);
    }
    if(elem_prog){
      elem_prog.setAttribute('id', 'gantt_progress_' + new_name);
    }
    if(elem_label){
      elem_label.setAttribute('id', 'gantt_label_bar_' + new_name);
    }
  }

  drawGanttTasks(task, complete=[]){
    if(this.isComplete(task.name, complete)){
      return;
    }
    complete.push(task.name);
    this.drawGanttTask(task);
    for(let i=0; i<this.tasks.length; i++){
      for(let j=0; j<this.tasks[i].dependencies.length; j++){
        if(this.tasks[i].dependencies[j] === task.name){
          this.drawGanttTasks(this.tasks[i], complete);
          break;
        }
      }
    }
  }

  drawGanttTask(task){
    let elem_rect  = document.getElementById('gantt_label_rect_' + task.name);
    let elem_text  = document.getElementById('gantt_label_' + task.name);
    let elem_event = document.getElementById(task.name);
    let elem_bar   = document.getElementById('gantt_bar_' + task.name);
    let elem_prog  = document.getElementById('gantt_progress_' + task.name);
    let elem_label = document.getElementById('gantt_label_bar_' + task.name);
    //----------
    // Task
    //----------
    if(elem_text != null){
      let elem_rect_class = 'gantt-bar-task-none';
      let elem_text_class = 'gantt-bar-label';
      if(100 <= task.progress){
        elem_rect_class = 'gantt-bar-task-complete';
        elem_text_class = 'gantt-bar-label-complete';
      }
      else{
        if(this.config.taskbg){
          elem_rect_class = 'gantt-bar-task' + task.custom_class;
          elem_text_class = 'gantt-bar-label' + task.custom_class;
        }
      }
      //Rect
      elem_rect.setAttribute('class', elem_rect_class);
      //Text
      elem_text.setAttribute('class', elem_text_class);
      elem_text.textContent = this.getTaskText(task);
    }
    //----------
    // Bar
    //----------
    if(elem_bar != null){
      //Bar
      let x  = (this.head.w*(dateCalsDays(this.p.s, new Date(task.start)) -1))/this.p.g;
      let w  = (this.head.w*task.days)/this.p.g;
      elem_bar.setAttribute('class', 'gantt-bar' + task.custom_class);
      elem_bar.setAttribute('x', x);
      elem_bar.setAttribute('width', w);
      //Progress
      elem_prog.setAttribute('class', 'gantt-bar-progress' + task.custom_class);
      elem_prog.setAttribute('x', x);
      elem_prog.setAttribute('width', w*task.progress/100);
      //Text
      if(elem_label != null){
        elem_label.textContent = task.name;
      }
      this.moveArrow(task.name);
    }
  }

  changeRange(range=this.config.range){
    this.drawGantt(range);
  }

  changeHeight(height){
    if(200 <= height){
      this.config.height = height;
      this.drawGantt();
    }
  }

  changeViewComplete(complete){
    this.config.complete = complete;
    this.drawGantt();
  }

  changeViewText(text){
    this.config.text = text;
    this.drawGantt();
  }

  changeTaskClose(name){
    let task = this.tasks.find((t) => t.name === name);
    if(task){
      if(task.close){
        task.close = 0;
      }
      else{
        task.close = 1;
      }
      this.drawGantt();
    }
  }

  changeTaskbg(taskbg){
    this.config.taskbg = taskbg;
    this.drawGantt();
  }

  changeTaskMask(st_mask, ed_mask){
    this.config.start_mask = st_mask;
    this.config.end_mask = ed_mask;
    this.drawGantt();
  }

  changeMaskKeyword(key_mask){
    this.config.key_mask = key_mask;
    this.drawGantt();
  }

  changeEvents(events){
    for(let i=0; i<this.config.events.length; i++){
      let id   = 'event_' + this.config.events[i].date;
      let elem =  document.getElementById(id);
      if(elem){
        elem.remove();
      }
    }
    this.config.events = events;
    let cal = document.getElementById(this.cal_id);
    let svg = SVG.adopt(cal);
    this.drowEvent(svg, this.config.events);
    this.writeHistory('changeEvents');
  }

  selectTask(name=''){
    let gantt= document.getElementById(this.tsk_id);
    let svg  = SVG.adopt(gantt);
    let s_id = 'gantt_label_select';
    let elem =  document.getElementById(s_id);
    if(elem){
      elem.remove();
      this.select = '';
    }
    if(0 < name.length){
       let next = document.getElementById('gantt_label_' + name);
       if(next){
         let box = next.getBBox();
         let step= this.task.h;
         let y   = box.y;
         let w   = this.head.ow-this.task.s;
         svg.rect(w, step).attr({x:0, y:y, id:s_id}).addClass('gantt-bar-task-select');
         this.select = name;
       }
    }
  }

  //------------------------
  // config
  //------------------------
  setConfig(svg, tasks){
    let sp = 2;
    let h  = this.getTextHeight(svg);
    let t  = this.getNameLength(svg, tasks);
    let s  = 17;
    svg.addClass('gantt-MyGantt');
    // Period Congig
    this.p = this.getStartEnd(tasks);
    // Head View Config
    this.head = {'sp':sp, 'l':2, 'ow':t+s, 'h':(h+sp)*3, 's':'Day', 'w':(h+sp*2)*this.p.r, 'f':h };
    // Task View Config
    this.task = {'sp':sp, 'l':2, 'oh':this.head.h, 'h':h+sp*2, 'f':h, 'b':h-sp*2, 'a':4, 's':s };
    // Svg View Config
    let days = dateCalsDays(this.p.s, this.p.e) -1;
    this.w = this.head.ow + (this.head.w*days)/this.p.g;
    this.h = this.head.h + this.task.h*this.getTasksViewCount(tasks) + this.task.sp + this.task.s;
  }

  getTasksViewCount(tasks){
    let cnt = 0;
    this.clearCloseWrok();
    for(let i=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        continue;
      }
      cnt++;
    }
    return cnt;
  }

  getNameLength(svg, tasks){
    let max = 150;
    for(let i=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        continue;
      }
      let id   = 'setConfig_damy';
      let name = this.getTaskText(tasks[i]) + '???';
      let text = svg.text(name).attr({x:0, y:30, id:id}).addClass('gantt-bar-label');
      let box  = document.getElementById(id).getBBox();
      let w    = box.width;
      text.remove();
      if(max < w){
        max = w;
      }
    }
    return (3+max);
  }

  getTextHeight(svg){
    let id   = 'setConfig_damy';
    let text = svg.text('?????????').attr({x:0, y:30, id:id}).addClass('gantt-bar-label');
    let box  = document.getElementById(id).getBBox();
    let h    = box.height;
    text.remove();
    return h;
  }

  getStartEnd(tasks){
    let s = new Date('3000-01-01');
    let e = new Date('2000-01-01');
    let g = 1;
    let r = 3;
    for(let i=0; i<tasks.length; i++){
      let s_tmp = new Date(tasks[i].start);
      let e_tmp = dateAddDays(s_tmp, tasks[i].days);
      s = (s_tmp < s) ? s_tmp : s;
      e = (e < e_tmp) ? e_tmp : e;
    }
    s = dateAddDays(s, -1);
    e = dateAddDays(e, +1);
    if(0 < this.config.start_mask.length){
      let stmsk_date = new Date(this.config.start_mask);
      if(s < stmsk_date){
        s = stmsk_date;
      }
    }
    if(0 < this.config.end_mask.length){
      let edmsk_date = dateAddDays(new Date(this.config.end_mask), 1);
      if(edmsk_date < e){
        e = edmsk_date;
      }
    }
    switch(this.config.range){
    case 'Quarter':
      s = new Date(s.getFullYear() + '/1/1');
      e = new Date(e.getFullYear() + '/12/31');
      g = 31*3;
      break;
    case 'Month':
      s = new Date(s.getFullYear() + '/' + (1+s.getMonth()) + '/1');
      e = new Date(e.getFullYear() + '/' + (2+e.getMonth()) + '/1');
      e = dateAddDays(e, -1);
      g = 31;
      break;
    case 'Week':
      s = dateAddDays(s, (0 < s.getDay() ? 1-s.getDay() : -6));
      e = dateAddDays(e, (0 < s.getDay() ? 7-s.getDay() : 0));
      g = 7;
      break;
    default:
      this.config.range = 'Day';
      r = 1;
      break;
    }
    let p = {'s':s, 'e':e, 'g':g, 'r':r};
    return p;
  }

  //------------------------
  // frame
  //------------------------
  createFrame(svg){
    let no = Math.ceil((this.config.height - this.head.h - this.task.sp - this.task.s)/this.task.h);
    let sw = this.w;
    let sh = this.head.h + this.task.h*(no) + this.task.sp + this.task.s;
    document.getElementById(this.svg_id).setAttribute('width', sw);
    document.getElementById(this.svg_id).setAttribute('height', sh);
    let x  = this.head.ow;
    let y  = this.head.h;
    let w  = sw - x;
    let h  = ((sh < this.h) ? this.h : sh) - y - this.task.s;
    let s  = this.task.s;
    let e  = x - s;
    let f  = sh - s;
    let m  = document.getElementById(this.div_id).clientWidth;
    let n  = sh -y -s;
    this.frame = {'sw':sw, 'sh':sh, 'x':x, 'y':y, 'w':w, 'h':h, 's':s, 'e':e, 'f':f, 'm':m, 'n':n};
    //???????????????????????????????????????????????????bar???cal???tsk???cmd?????????????????????
    svg.group().attr({transform:'translate('+x+','+y+')', id:this.bar_id}).rect(w, h).attr({x:0, y:0}).addClass('gantt-background');
    svg.group().attr({transform:'translate('+x+','+0+')', id:this.cal_id}).rect(w, y).attr({x:0, y:0}).addClass('gantt-background');
    svg.group().attr({transform:'translate('+0+','+y+')', id:this.tsk_id}).rect(x, h).attr({x:0, y:0}).addClass('gantt-background');
    svg.group().attr({transform:'translate('+0+','+0+')', id:this.cmd_id}).rect(x, y).attr({x:0, y:0}).addClass('gantt-background');
    svg.group().attr({transform:'translate('+0+','+f+')', id:this.xsc_id}).rect(m, s).attr({x:0, y:0}).addClass('gantt-background');
    svg.group().attr({transform:'translate('+e+','+y+')', id:this.ysc_id}).rect(s, n).attr({x:0, y:0}).addClass('gantt-background');
  }

  drowGroupCmd(){
    let cmd = document.getElementById(this.cmd_id);
    let svg = SVG.adopt(cmd);
    this.drawHeader(svg, cmd.getBBox());
  }

  drowGroupTsk(){
    let tsk = document.getElementById(this.tsk_id);
    let svg = SVG.adopt(tsk);
    this.drawBackgraundEven(svg, tsk.getBBox());
    this.drawTask(svg, this.tasks);
  }

  drowGroupCal(){
    let cal = document.getElementById(this.cal_id);
    let svg = SVG.adopt(cal);
    this.drawHeader(svg, cal.getBBox());
    this.drawCalendarHeader(svg, cal.getBBox());
    this.drowEvent(svg, this.config.events);
  }

  drowGroupBar(){
    let bar = document.getElementById(this.bar_id);
    let svg = SVG.adopt(bar);
    this.drawBackgraundEven(svg, bar.getBBox());
    this.drawGrid(svg, bar.getBBox());
    this.drawCalendar(svg, bar.getBBox());
    this.drawBar(svg, this.tasks);
    this.drawArrows(svg, this.tasks);
  }

  drowGroupXsc(){
    let xsc = document.getElementById(this.xsc_id);
    let svg = SVG.adopt(xsc);
    this.drawXScrollBar(svg, xsc.getBBox());
  }

  drowGroupYsc(){
    let ysc = document.getElementById(this.ysc_id);
    let svg = SVG.adopt(ysc);
    this.drawYScrollBar(svg, ysc.getBBox());
  }

  setPositionAndSize(){
    let tsk = document.getElementById(this.tsk_id);
    let cal = document.getElementById(this.cal_id);
    let bar = document.getElementById(this.bar_id);
    let x  = this.frame.x + this.getXScrollOffSet();
    let y  = this.frame.y + this.getYScrollOffSet();
    tsk.setAttribute('transform', 'translate('+0+','+y+')');
    cal.setAttribute('transform', 'translate('+x+','+0+')');
    bar.setAttribute('transform', 'translate('+x+','+y+')');
    this.config.xpos = document.getElementById('gantt_xscroll_bar').getBBox().x;
    this.config.ypos = document.getElementById('gantt_yscroll_bar').getBBox().y;
  }

  getXScrollOffSet(){
    let base = document.getElementById('gantt_xscroll_base').getBBox();
    let bar  = document.getElementById('gantt_xscroll_bar').getBBox();
    let cal  = document.getElementById(this.cal_id).getBBox();
    let xos  = -cal.width*(bar.x - base.x)/base.width;
    return xos;
  }

  getYScrollOffSet(){
    let base = document.getElementById('gantt_yscroll_base').getBBox();
    let bar  = document.getElementById('gantt_yscroll_bar').getBBox();
    let tsk  = document.getElementById(this.tsk_id).getBBox();
    let yos  = -tsk.height*(bar.y - base.y)/base.height;
    return yos;
  }

  getXScrollPosition(base_x, base_w, bar_w){
    let cal  = document.getElementById(this.cal_id).getBBox();
    let min  = base_x;
    let max  = base_x + base_w - bar_w;
    if(max < min){ max = min; }
    let x    = this.config.xpos;
    if(0 > this.config.xpos){
      let len  = ((dateCalsDays(new Date(this.p.s), new Date())-this.getXScrollMargein())*this.head.w)/this.p.g;
      x = min + (base_w*len)/cal.width;
    }
    if(x < min){
      x = min;
    }
    else if(max < x){
      x = max;
    }
    this.config.xpos = x;
    return x;
  }

  getXScrollMargein(){
    let num = 20*this.p.g;
    switch(this.config.range){
    case 'Quarter':
    case 'Month':
      num = 4*this.p.g
      break;
    case 'Week':
      num = 7*this.p.g
      break;
    default:
      break;
    }
    return num;
  }

  getYScrollPosition(base_y, base_h, bar_h){
    let y    = this.config.ypos;
    if(0 > this.config.ypos){
      y = base_h -base_y -bar_h;
    }
    return y;
  }

  //------------------------
  // draw
  //------------------------
  drawXScrollBar(svg, box){
    let x  = document.getElementById(this.tsk_id).getBBox().width;
    let y  = 0;
    let w  = box.width -x;
    let h  = box.height;
    svg.rect(w, h).attr({x:x, y:y, id:'gantt_xscroll_base'}).addClass('gantt-scroll-background');
    let m  = document.getElementById(this.cal_id).getBBox().width;
    let l  = (w*w)/m;
    let p  = this.getXScrollPosition(x, w, l);
    let id = 'gantt_xscroll_bar';
    svg.rect(l, h).attr({x:p, y:y, id:id, cursor:'pointer'}).addClass('gantt-scroll');
    let elem = document.getElementById(id);
    elem.addEventListener('mousedown',  this.eventXScrollBarDown);
    elem.addEventListener('mousemove',  this.eventMouseMove);
    document.onmousemove = this.eventMouseMove;
    document.onmouseup   = this.eventMouseUp;
  }

  drawYScrollBar(svg, box){
    let w  = this.task.s;
    let h  = document.getElementById(this.ysc_id).getBBox().height;
    svg.rect(w, h).attr({x:0, y:0, id:'gantt_yscroll_base'}).addClass('gantt-scroll-background');
    let m  = document.getElementById(this.tsk_id).getBBox().height;
    let l  = (h*h)/m;
    let p  = this.getYScrollPosition(0, h, l);
    let id = 'gantt_yscroll_bar';
    svg.rect(w, l).attr({x:0, y:p, id:id, cursor:'pointer'}).addClass('gantt-scroll');
    let elem = document.getElementById(id);
    elem.addEventListener('mousedown',  this.eventYScrollBarDown);
    elem.addEventListener('mousemove',  this.eventMouseMove);
    document.onmousemove = this.eventMouseMove;
    document.onmouseup   = this.eventMouseUp;
  }

  drawHeader(svg, box){
    let w  = box.width;
    let h  = box.height;
    svg.rect(w, h).attr({x:0, y:0}).addClass('gantt-header');
  }

  drawBackgraundEven(svg, box){
    let step = this.task.h;
    for(let y=0; y < box.height; y+=step*2){
      let w  = box.width;
      let h  = step;
      svg.rect(w, h).attr({x:0, y:y}).addClass('gantt-background-even');
    }
  }

  drawGrid(svg, box){
    for(let sx=0; sx<box.width; sx+=this.head.w){
      let sy  = 0;
      let ex  = sx;
      let ey  = box.height;
      svg.polyline([sx,sy, ex,ey]).addClass('gantt-grid');
    }
  }

  drawCalendarHeader(svg, box){
    switch(this.config.range){
    case 'Quarter':
      this.drawCalendarQuarterHeader(svg, box);
      break;
    case 'Month':
      this.drawCalendarMonthHeader(svg, box);
      break;
    case 'Week':
      this.drawCalendarWeekHeader(svg, box);
      break;
    default:
      this.drawCalendarDayHeader(svg, box);
      break;
    }
  }

  drawCalendar(svg, box){
    switch(this.config.range){
    case 'Quarter':
      this.drawCalendarQuarter(svg, box);
      break;
    case 'Month':
      this.drawCalendarMonth(svg, box);
      break;
    case 'Week':
      this.drawCalendarWeek(svg, box);
      break;
    default:
      this.drawCalendarDay(svg, box);
      break;
    }
  }

  drawCalendarQuarterHeader(svg, box){
    let date = this.p.s;
    let i = 0;
    let top  = -1;
    while(date < this.p.e){
      if(top != date.getFullYear()){
        this.drawCalendarTopRough(svg, date, i);
        top = date.getFullYear();
      }
      this.drawCalendarText(svg, box, this.getQuarterText(date), i++);
      date = dateAddDays(date, this.p.g);
    }
  }

  drawCalendarQuarter(svg, box){
    let date = this.p.s;
    let i = 0;
    let top  = -1;
    while(date < this.p.e){
      this.drawCalendarPointNow(svg, box, date, i);
      if(top != date.getFullYear()){
        this.drawCalendarPointRough(svg, box, i);
        top = date.getFullYear();
      }
      date = dateAddDays(date, this.p.g);
      i++;
    }
  }

  drawCalendarMonthHeader(svg, box){
    let date = this.p.s;
    let i = 0;
    let top  = -1;
    while(date < this.p.e){
      if(top != date.getFullYear()){
        this.drawCalendarTopRough(svg, date, i);
        top = date.getFullYear();
      }
      this.drawCalendarText(svg, box, this.getMonthText(date) + '???', i++);
      date = dateAddDays(date, this.p.g);
    }
  }

  drawCalendarMonth(svg, box){
    let date = this.p.s;
    let i = 0;
    let top  = -1;
    while(date < this.p.e){
      this.drawCalendarPointNow(svg, box, date, i);
      if(top != date.getFullYear()){
        this.drawCalendarPointRough(svg, box, i);
        top = date.getFullYear();
      }
      date = dateAddDays(date, this.p.g);
      i++;
    }
  }

  drawCalendarWeekHeader(svg, box){
    let date = this.p.s;
    let i = 0;
    let top  = -1;
    let month = -1;
    while(date < this.p.e){
      if(top != date.getMonth()){
        this.drawCalendarTopRough(svg, date, i);
        top = date.getMonth();
      }
      this.drawCalendarText(svg, box, this.getMonthText(date) + '/' + date.getDate(), i++);
      date = dateAddDays(date, this.p.g);
    }
  }

  drawCalendarWeek(svg, box){
    let date = this.p.s;
    let i = 0;
    let month = -1;
    while(date < this.p.e){
      this.drawCalendarPointNow(svg, box, date, i);
      if(month != date.getMonth()){
        this.drawCalendarPointRough(svg, box, i);
        month = date.getMonth();
      }
      date = dateAddDays(date, this.p.g);
      i++;
    }
  }

  drawCalendarDayHeader(svg, box){
    let date = this.p.s;
    let i = 0;
    let top = -1;
    while(date < this.p.e){
      if(top != date.getMonth()){
        this.drawCalendarTop(svg, date, i);
        top = date.getMonth();
      }
      this.drawCalendarText(svg, box, date.getDate(), i++);
      date = dateAddDays(date, 1);
    }
  }

  drawCalendarDay(svg, box){
    let date = this.p.s;
    let i = 0;
    while(date < this.p.e){
      this.drawCalendarPoint(svg, box, date, i);
      date = dateAddDays(date, 1);
      i++;
    }
  }

  drawCalendarText(svg, box, text, index){
      let x  = this.head.w*(index) + this.head.sp + this.head.l;
      let y  = this.head.f*2 + this.head.sp + this.head.l;
      svg.text(text).attr({x:x, y:y}).addClass('gantt-grid-label');
  }

  drawCalendarPoint(svg, box, date, index){
    let today    = (dateFormat(date) === dateFormat(new Date()));
    let weekend  = ((date.getDay() === 0) | (date.getDay() === 6));
    let firstday = (date.getDate() === 1);
    let holiday  = this.isHoliday(date);
    if(today || weekend || holiday){
      let x  = this.head.w*(index);
      let y  = 0;
      let w  = this.head.w;
      let h  = box.height;
      let c  = (today) ? 'gantt-today-highlight' : 'gantt-weekend-highlight';
      svg.rect(w, h).attr({x:x, y:y}).addClass(c);
    }
    if(firstday){
      let sx = this.head.w*(index);
      let sy = 0;
      let ex = sx;
      let ey = box.height;
      svg.polyline([sx,sy, ex,ey]).addClass('gantt-firstday-highlight');
    }
  }

  drawCalendarPointRough(svg, box, index){
    let sx = this.head.w*(index);
    let sy = 0;
    let ex = sx;
    let ey = box.height;
    svg.polyline([sx,sy, ex,ey]).addClass('gantt-firstday-highlight');
  }

  drawCalendarPointNow(svg, box, date, index){
    let td = new Date();
    let ed = dateAddDays(date, this.p.g);
    let step = this.head.w;
    if((date <= td) && (td < ed)){
      let x  = step*(index);
      let y  = 0;
      let w  = step;
      let h  = box.height;
      svg.rect(w, h).attr({x:x, y:y}).addClass('gantt-today-highlight');
    }
  }

  isHoliday(date){
    for(let i=0; i<this.config.holiday.length; i++){
      if(dateFormat(date) === dateFormat(new Date(this.config.holiday[i]))){
        return true;
      }
    }
    return false;
  }

  drawCalendarTop(svg, date, index){
    let x  = this.head.w*(index) + this.head.sp + this.head.l;
    let y  = this.head.f + this.head.sp + this.head.l;
    svg.text(date.getFullYear() + '???' +  this.getMonthText(date) + '???').attr({x:x, y:y}).addClass('gantt-grid-label-top');
  }

  drawCalendarTopRough(svg, date, index){
    let x  = this.head.w*(index) + this.head.sp + this.head.l;
    let y  = this.head.f + this.head.sp + this.head.l;
    svg.text(date.getFullYear() + '???').attr({x:x, y:y}).addClass('gantt-grid-label-top');
  }

  getQuarterText(date){
    let q  = ['1Q', '1Q', '1Q', '2Q', '2Q', '2Q', '3Q', '3Q', '3Q', '4Q', '4Q', '4Q'];
    return q[date.getMonth()];
  }

  getMonthText(date){
    let m  = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    return m[date.getMonth()];
  }

  drowEvent(svg, events){
    for(let i=0; i<events.length; i++){
      if(this.isTaskMask(events[i].date)){
        continue;
      }
      let day= dateCalsDays(new Date(this.p.s), new Date(events[i].date));
      let x  = (this.head.w*(day -1))/this.p.g + this.head.sp + this.head.l;
      let y  = this.head.f*3 + this.head.sp + this.head.l;
      let id = 'event_' + events[i].date;
      svg.text('???' + events[i].name).attr({x:x, y:y, id:id}).addClass('gantt-event');
    }
  }

  drawTask(svg, tasks){
    let step = this.task.h;
    this.clearCloseWrok();
    for(let i=0,c=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        continue;
      }
      let x  = this.task.sp;
      let y  = step*(c+1) - this.task.sp - this.task.l*2;
      let w  = this.head.ow-this.task.s;
      let id = 'gantt_label_' + tasks[i].name;
      let idr= 'gantt_label_rect_' + tasks[i].name;
      if(100 <= tasks[i].progress){
        svg.rect(w, step).attr({x:0, y:(step*c), id:idr}).addClass('gantt-bar-task-complete');
        svg.text(this.getTaskText(tasks[i])).attr({x:x, y:y, id:id, cursor:'pointer'}).addClass('gantt-bar-label-complete');
      }
      else{
        if(this.config.taskbg){
          svg.rect(w, step).attr({x:0, y:(step*c), id:idr}).addClass('gantt-bar-task' + tasks[i].custom_class);
          svg.text(this.getTaskText(tasks[i])).attr({x:x, y:y, id:id, cursor:'pointer'}).addClass('gantt-bar-label' + tasks[i].custom_class);
        }
        else{
          svg.rect(w, step).attr({x:0, y:(step*c), id:idr}).addClass('gantt-bar-task-none');
          svg.text(this.getTaskText(tasks[i])).attr({x:x, y:y, id:id, cursor:'pointer'}).addClass('gantt-bar-label');
        }
      }
      let elem = document.getElementById(id);
      elem.addEventListener('mousedown', this.eventSelectTask);
      elem.addEventListener('dblclick',  this.eventDblClickTask);
      c++;
    }
  }

  clearCloseWrok(){
    this.close = 9;
  }

  isTaskHide(task){
    if(this.close < task.layer){
      return true;
    }
    else if(task.close){
      this.close = task.layer;
    }
    else{
      this.clearCloseWrok();
    }
    if(this.config.complete && (100<=task.progress)){
      return true;
    }
    if(this.isTaskMask(task.start)){
      return true;
    }
    if(!this.isTaskHit(task)){
      return true;
    }
    return false;
  }

  isTaskMask(start){
    let task_start = new Date(start);
    if(0 < this.config.start_mask.length){
      if(task_start < new Date(this.config.start_mask)){
        return true;
      }
    }
    if(0 < this.config.end_mask.length){
      let ed_mask = new Date(this.config.end_mask);
      if(new Date(this.config.end_mask) < task_start){
        return true;
      }
    }
    return false;
  }
  
  isTaskHit(task){
    if(this.config.key_mask === ''){
      return true;
    }
    return (0 <= task.name.indexOf(this.config.key_mask));
  }

  getTaskText(task){
    let mark = (task.close) ? '??? ' : '??? ';
    let text = this.getLayerSp(task.layer) + mark + task.name;
    return text;
  }

  getLayerSp(layer){
    let sp = '';
    for(let i=1; i < layer; i++){
      sp += '???';
    }
    return sp;
  }

  drawBar(svg, tasks){
    this.clearCloseWrok();
    for(let i=0,c=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        if('on' === tasks[i].sameline){
          if(!this.isTaskMask(tasks[i].start)){
            if(this.isTaskHit(tasks[i])){
              this.drawBarSub(svg, tasks[i], c-1);
            }
          }
        }
        continue;
      }
      this.drawBarSub(svg, tasks[i], c);
      c++;
    }
    document.onmousemove = this.eventMouseMove;
    document.onmouseup   = this.eventMouseUp;
  }

  drawBarSub(svg, task, count){
    let step = this.task.h;
    let x  = (this.head.w*(dateCalsDays(this.p.s, new Date(task.start)) -1))/this.p.g;
    let y  = step*(count) + (step-this.task.b-this.task.sp-this.task.l);
    let w  = (this.head.w*task.days)/this.p.g;
    let h  = this.task.b;
    let id = task.name;
    let g  = svg.group().attr({transform:'translate(0,0)', id:id, cursor:'pointer'});
    g.rect(w, h).attr({x:x, y:y, id:'gantt_bar_' + task.name, rx:3, ry:3}).addClass('gantt-bar' + task.custom_class);
    g.rect(w*task.progress/100, h*2/3).attr({x:x, y:y+(h/3), id:'gantt_progress_' + task.name, rx:3, ry:3}).addClass('gantt-bar-progress' + task.custom_class);
    if(this.config.text){
      //TODO:
      g.text(task.name).attr({x:x, y:y+h-this.task.l, id:'gantt_label_bar_' + id}).addClass('gantt-over-label' + task.custom_class);
    }
    let elem = document.getElementById(id);
    elem.addEventListener('mouseenter', this.eventMouseEnter);
    elem.addEventListener('mouseleave', this.eventMouseLeave);
    elem.addEventListener('mousedown',  this.eventMouseDown);
    elem.addEventListener('mousemove',  this.eventMouseMove);
  }

  drawArrows(svg, tasks){
    this.clearCloseWrok();
    for(let i=0; i<tasks.length; i++){
      this.drawArrow(svg, tasks[i]);
    }
  }

  drawArrow(svg, task){
    if(this.isTaskHide(task)){
      return;
    }
    if(task.dependencies){
      for(let j=0; j<task.dependencies.length; j++){
        let id   = 'gantt_arrow_' + task.dependencies[j] + '_' + task.name;
        let point= this.getPoint(task.name, task.dependencies[j]);
        let line = svg.polyline(point).attr({id:id}).addClass('gantt-arrow');
        line.marker('end', this.task.a, this.task.a, function(add){add.polygon([0,0, 0,4, 4,2]).addClass('gantt-arrow-end');});
      }
    }
  }

  getPoint(task_name, dependencies_name){
    let st = document.getElementById('gantt_bar_' + dependencies_name);
    let ed = document.getElementById('gantt_bar_' + task_name);
    if((!st) || (!ed)){
      return []
    }
    let st_box = st.getBBox();
    let ed_box = ed.getBBox();
    let id = '';
    let sx = st_box.x + st_box.width;
    let sy = st_box.y + st_box.height;
    let mx = sx;
    let my = ed_box.y + ed_box.height/2;
    let ex = ed_box.x - this.task.a/2;
    let ey = my;
    let dx = -1;
    let dy = sy;
    if(ex < sx){
      sx = ex - this.task.a*2;
      mx = sx;
      if(sx < st_box.x){
        dx = st_box.x;
      }
    }
    if(ey < sy){
      sy = (st_box.y == ed_box.y) ? ey : st_box.y;
      dy = sy
    }
    let point = [sx,sy, mx,my, ex,ey];
    if(-1 < dx){
      point = [dx,dy, sx,sy, mx,my, ex,ey];
    }
    return point;
  }

  moveBars(name, mov, ongrid, complete=[]){
    if(this.isComplete(name, complete)){
      return;
    }
    complete.push(name);
    this.moveBar(name, mov, ongrid);
    for(let i=0; i<this.tasks.length; i++){
      for(let j=0; j<this.tasks[i].dependencies.length; j++){
        if(this.tasks[i].dependencies[j] === name){
          this.moveBars(this.tasks[i].name, mov, ongrid, complete);
          break;
        }
      }
    }
  }

  isComplete(name, complete){
    for(let i=0; i<complete.length; i++){
      if(complete[i] === name){
        return true;
      }
    }
    return false;
  }

  moveBar(name, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.name === name);
    let b    = document.getElementById('gantt_bar_' + name);
    let p    = document.getElementById('gantt_progress_' + name);
    let t    = document.getElementById('gantt_label_bar_' + name);
    if(b == null){
      if(ongrid){
        let days = dateCalsDays(new Date(this.movebef), new Date(this.movenow))
        this.tasks[i].start = dateFormat(dateAddDays(new Date(this.tasks[i].start), days-1));
      }
      return;
    }
    let x    = b.x.baseVal.value + mov;
    if(ongrid){
      let days = Math.round((b.x.baseVal.value)*this.p.g/this.head.w)
      x = (this.head.w*(days))/this.p.g;
      this.movebef = this.tasks[i].start;
      this.tasks[i].start = dateFormat(dateAddDays(this.p.s, days));
      this.movenow = this.tasks[i].start;
    }
    b.x.baseVal.value = x;
    p.x.baseVal.value = x;
    if(t != null){
      //TODO:
      t.x.baseVal.getItem(0).value = x;
    }
    this.moveArrow(name);
  }

  moveArrow(name){
    for(let i=0; i<this.tasks.length; i++){
      if(this.tasks[i].name === name){
        for(let j=0; j<this.tasks[i].dependencies.length; j++){
          let point= this.getPoint(this.tasks[i].name, this.tasks[i].dependencies[j]);
          if(0 < point.length){
            let id_a = 'gantt_arrow_' + this.tasks[i].dependencies[j] + '_' + this.tasks[i].name;
            let poly = document.getElementById(id_a);
            if(poly){
              poly.setAttribute('points', point);
            }
          }
        }
      }
    }
  }

  addArrow(task){
    let bar = document.getElementById(this.bar_id);
    let svg = SVG.adopt(bar);
    this.clearCloseWrok();
    this.drawArrow(svg, task);
    this.writeHistory('addArrow ' + task.name);
  }

  removeArrow(task){
    for(let i=0; i<task.dependencies.length; i++){
      let id   = 'gantt_arrow_' + task.dependencies[i] + '_' + task.name;
      let line = document.getElementById(id);
      if(line){
        line.remove();
      }
    }
    this.writeHistory('removeArrow ' + task.name);
  }

  isNeedReview(tasks=null){
    let start = new Date(this.p.s);
    let end   = new Date(this.p.e); 
    if(tasks == null){
      tasks = this.tasks;
    }
    for(let i=0; i<tasks.length; i++){
      let bar = document.getElementById('gantt_bar_' + tasks[i].name);
      if(bar == null){
        continue;
      }
      let ts  = new Date(tasks[i].start);
      let te  = dateAddDays(ts, tasks[i].days);
      if((ts < start) || (end < te)){
        return true;
      }
    }
    return false;
  }

  moveXscroll(x){
    let base = document.getElementById('gantt_xscroll_base').getBBox();
    let bar  = document.getElementById('gantt_xscroll_bar');
    let min  = base.x;
    let max  = base.x + base.width - bar.getBBox().width;
    if(max < min){ max = min; }
    if(x < min){
      x = min;
    }
    else if(max < x){
      x = max;
    }
    bar.x.baseVal.value = x;
    this.setPositionAndSize();
  }

  moveYscroll(y){
    let base = document.getElementById('gantt_yscroll_base').getBBox();
    let bar  = document.getElementById('gantt_yscroll_bar');
    let min  = base.y;
    let max  = base.y + base.height - bar.getBBox().height;
    if(max < min){ max = min; }
    if(y < min){
      y = min;
    }
    else if(max < y){
      y = max;
    }
    bar.y.baseVal.value = y;
    this.setPositionAndSize();
  }

  addResizeItem(name){
    let elem = document.getElementById(name);
    let svg  = SVG.adopt(elem);
    let box  = elem.getBBox();
    let w    = 2;
    let h    = box.height;
    let lx   = box.x;
    let rx   = lx +box.width -w;
    let y    = box.y;
    svg.rect(w, h).attr({x:lx, y:y, id:'gantt_bar_left_' + name, cursor:'w-resize'}).addClass('gantt-bar-resize');
    svg.rect(w, h).attr({x:rx, y:y, id:'gantt_bar_right_' + name, cursor:'e-resize'}).addClass('gantt-bar-resize');
    let re    = document.getElementById('gantt_bar_right_' + name);
    let le    = document.getElementById('gantt_bar_left_' + name);
    re.addEventListener('mousedown',  this.eventRightDown);
    le.addEventListener('mousedown',  this.eventLeftDown);
  }

  removeResizeItem(name){
    document.getElementById('gantt_bar_left_' + name).remove();
    document.getElementById('gantt_bar_right_' + name).remove();
    MyGanttDraggableItem.edgeElem = null;
  }

  resizeBarRight(name, width, progress, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.name === name);
    let b    = document.getElementById('gantt_bar_' + name);
    let p    = document.getElementById('gantt_progress_' + name);
    let w    = width + mov;
    if(this.p.g/this.head.w < w){
      if(ongrid){
        let days = Math.round((b.width.baseVal.value)*this.p.g/this.head.w)
        w = (this.head.w*(days))/this.p.g;
        this.tasks[i].days = days;
      }
      b.width.baseVal.value = w;
      p.width.baseVal.value = (w*progress)/100;
      this.moveArrow(name);
    }
  }

  resizeBarLeft(name, basex, width, progress, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.name === name);
    let b    = document.getElementById('gantt_bar_' + name);
    let p    = document.getElementById('gantt_progress_' + name);
    let t    = document.getElementById('gantt_label_bar_' + name);
    let x    = b.x.baseVal.value + mov;
    let w    = width + (basex-x);
    if(this.p.g/this.head.w < w){
      if(ongrid){
        let days = Math.round((b.x.baseVal.value)*this.p.g/this.head.w)
        x = (this.head.w*(days))/this.p.g;
        w = width + (basex-x);
        this.tasks[i].start = dateFormat(dateAddDays(this.p.s, days));
        this.tasks[i].days  = Math.round((w)*this.p.g/this.head.w);
      }
      b.x.baseVal.value = x;
      b.width.baseVal.value = w;
      p.x.baseVal.value = x;
      p.width.baseVal.value = (w*progress)/100;
      if(t != null){
        //TODO:
        t.x.baseVal.getItem(0).value = x;
      }
      this.moveArrow(name);
    }
  }

  //------------------------
  // event
  //------------------------
  eventSelectTask(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    let name = e.target.parentNode.id.replace('gantt_label_', '');
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    //TODO:?????????????????????????????????????????????????????????????????????????????????????????????????????????
    if(task == undefined){
      name = e.target.id.replace('gantt_label_', '');
      task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    }
    MyGanttDraggableItem.parent.config.onclick(task);
  }

  eventDblClickTask(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    let name = e.target.parentNode.id.replace('gantt_label_', '');
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    //TODO:?????????????????????????????????????????????????????????????????????????????????????????????????????????
    if(task == undefined){
      name = e.target.id.replace('gantt_label_', '');
      task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    }
    MyGanttDraggableItem.parent.changeTaskClose(name);
    MyGanttDraggableItem.parent.config.onchange(task);
  }

  eventMouseEnter(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    if((!MyGanttDraggableItem.dragElem) && (!MyGanttDraggableItem.rlenElem) && (!MyGanttDraggableItem.llenElem)){
      if(!MyGanttDraggableItem.edgeElem){
        MyGanttDraggableItem.edgeElem = e.target;
        MyGanttDraggableItem.parent.addResizeItem(MyGanttDraggableItem.edgeElem.id);
      }
    }
  }

  eventMouseLeave(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    if(MyGanttDraggableItem.edgeElem){
      MyGanttDraggableItem.parent.removeResizeItem(MyGanttDraggableItem.edgeElem.id);
    }
  }

  eventXScrollBarDown(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    MyGanttDraggableItem.xbarElem = e.target;
    let box  = MyGanttDraggableItem.xbarElem.getBBox();
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
  }

  eventYScrollBarDown(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    MyGanttDraggableItem.ybarElem = e.target;
    let box  = MyGanttDraggableItem.ybarElem.getBBox();
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
  }

  eventRightDown(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    let name = e.target.parentNode.id;
    let elem = document.getElementById(name);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + name);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
    MyGanttDraggableItem.baseX   = b.getBBox().x;
    MyGanttDraggableItem.baseW   = b.getBBox().width;
    MyGanttDraggableItem.baseP   = task.progress;
    MyGanttDraggableItem.rlenElem = elem;
    if(MyGanttDraggableItem.edgeElem){
      MyGanttDraggableItem.parent.removeResizeItem(MyGanttDraggableItem.edgeElem.id);
    }
    MyGanttDraggableItem.parent.config.onclick(task);
  }

  eventLeftDown(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    let name = e.target.parentNode.id;
    let elem = document.getElementById(name);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + name);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
    MyGanttDraggableItem.baseX   = b.getBBox().x;
    MyGanttDraggableItem.baseW   = b.getBBox().width;
    MyGanttDraggableItem.baseP   = task.progress;
    MyGanttDraggableItem.llenElem = elem;
    if(MyGanttDraggableItem.edgeElem){
      MyGanttDraggableItem.parent.removeResizeItem(MyGanttDraggableItem.edgeElem.id);
    }
    MyGanttDraggableItem.parent.config.onclick(task);
  }

  eventMouseDown(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    e.preventDefault();
    let name = e.target.parentNode.id;
    let elem = document.getElementById(name);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + name);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
    MyGanttDraggableItem.baseX   = b.getBBox().x;
    MyGanttDraggableItem.baseW   = b.getBBox().width;
    MyGanttDraggableItem.baseP   = task.progress;
    if((!MyGanttDraggableItem.rlenElem) && (!MyGanttDraggableItem.llenElem)){
      if(e.ctrlKey){
        let select = MyGanttDraggableItem.parent.tasks.find((t) => t.name === MyGanttDraggableItem.parent.select);
        if(select){
          let index = select.dependencies.findIndex((t) => t === name);
          if(0 <= index){
            MyGanttDraggableItem.parent.removeArrow(select);
            select.dependencies.splice(index, 1);
          }
          else{
            select.dependencies.push(name);
          }
          MyGanttDraggableItem.parent.addArrow(select);
          MyGanttDraggableItem.parent.config.onclick(select);
          return;
        }
      }
      MyGanttDraggableItem.dragElem = elem;
    }
    if(MyGanttDraggableItem.edgeElem){
      MyGanttDraggableItem.parent.removeResizeItem(MyGanttDraggableItem.edgeElem.id);
    }
    MyGanttDraggableItem.parent.config.onclick(task);
  }

  eventMouseUp(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    if(MyGanttDraggableItem.rlenElem){
      e.preventDefault();
      let name = MyGanttDraggableItem.rlenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + name);
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      MyGanttDraggableItem.parent.resizeBarRight(name, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x -b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
      MyGanttDraggableItem.parent.config.onchange(task);
      let scnt = dateCalsDays(new Date(MyGanttDraggableItem.parent.p.s), new Date(task.start));
      let ecnt = dateCalsDays(dateAddDays(new Date(task.start),task.days), new Date(MyGanttDraggableItem.parent.p.e));
      if((1>scnt) || (ecnt<2)){
        MyGanttDraggableItem.parent.drawGantt();
      }
    }
    else if(MyGanttDraggableItem.llenElem){
      e.preventDefault();
      let name = MyGanttDraggableItem.llenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + name);
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      MyGanttDraggableItem.parent.resizeBarLeft(name, MyGanttDraggableItem.baseX, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x-b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
      MyGanttDraggableItem.parent.config.onchange(task);
      let scnt = dateCalsDays(new Date(MyGanttDraggableItem.parent.p.s), new Date(task.start));
      let ecnt = dateCalsDays(dateAddDays(new Date(task.start),task.days), new Date(MyGanttDraggableItem.parent.p.e));
      if((1>scnt) || (ecnt<2)){
        MyGanttDraggableItem.parent.drawGantt();
      }
    }
    else if(MyGanttDraggableItem.dragElem){
      let name = MyGanttDraggableItem.dragElem.id;
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      let b    = document.getElementById('gantt_bar_' + name);
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      MyGanttDraggableItem.parent.moveBars(name, x-b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.name === name);
      MyGanttDraggableItem.parent.config.onchange(task);
      if(MyGanttDraggableItem.parent.isNeedReview()){
        MyGanttDraggableItem.parent.drawGantt();
      }
    }
    else if(MyGanttDraggableItem.xbarElem){
      MyGanttDraggableItem.xbarElem = null;
    }
    else if(MyGanttDraggableItem.ybarElem){
      MyGanttDraggableItem.ybarElem = null;
    }
  }

  eventMouseMove(e){
    //??????????????????????????????????????????this???addEventListener?????????????????????????????????????????????
    if(MyGanttDraggableItem.rlenElem){
      e.preventDefault();
      let name = MyGanttDraggableItem.rlenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + name);
      MyGanttDraggableItem.parent.resizeBarRight(name, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x -b.x.baseVal.value, false);
    }
    else if(MyGanttDraggableItem.llenElem){
      e.preventDefault();
      let name = MyGanttDraggableItem.llenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + name);
      MyGanttDraggableItem.parent.resizeBarLeft(name, MyGanttDraggableItem.baseX, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x-b.x.baseVal.value, false);
    }
    else if(MyGanttDraggableItem.dragElem){
      e.preventDefault();
      let name = MyGanttDraggableItem.dragElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + name);
      MyGanttDraggableItem.parent.moveBars(name, x -b.x.baseVal.value, false);
    }
    else if(MyGanttDraggableItem.xbarElem){
      e.preventDefault();
      MyGanttDraggableItem.parent.moveXscroll(e.clientX - MyGanttDraggableItem.offsetX);
    }
    else if(MyGanttDraggableItem.ybarElem){
      e.preventDefault();
      MyGanttDraggableItem.parent.moveYscroll(e.clientY - MyGanttDraggableItem.offsetY);
    }
  }
}
