//**************************
// Copyright (c) 2021 xxxx
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
      this.tasks[i].id = this.tasks[i].name;
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
      'onclick' : (task) => {},
      'onchange': (task) => {},
      'height'  : 200,
      'range'   : 'Day',
      'holiday' : [],
      'events'  : [],
      'complete': false,
      'text'    : false,
      'taskbg'  : false,
      'xpos'    : -1,
      'ypos'    : 0
    };
    if(config.onclick) { this.config.onclick  = config.onclick; }
    if(config.onchange){ this.config.onchange = config.onchange; }
    if(config.height)  { this.config.height   = config.height; }
    if(config.range)   { this.config.range    = config.range; }
    if(config.holiday) { this.config.holiday  = config.holiday; }
    if(config.events)  { this.config.events   = config.events; }
    if(config.complete){ this.config.complete = config.complete; }
    if(config.text)    { this.config.text     = config.text; }
    if(config.taskbg)  { this.config.taskbg   = config.taskbg; }
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

  upTask(id){
    let index = this.tasks.findIndex((t) => t.id === id);
    if(0 < index){
      let tmp = this.tasks[index];
      this.tasks[index]   = this.tasks[index-1];
      this.tasks[index-1] = tmp;
      this.drawGantt();
    }
  }

  downTask(id){
    let index = this.tasks.findIndex((t) => t.id === id);
    if(index < (this.tasks.length -1)){
      let tmp = this.tasks[index];
      this.tasks[index]   = this.tasks[index+1];
      this.tasks[index+1] = tmp;
      this.drawGantt();
    }
  }

  updateTask(id, task){
    let index = this.tasks.findIndex((t) => t.id === id);
    if((0 <= index) && this.isEnableName(id, task.name) && this.isEnableDependencies(id, task.name, task.dependencies)){
      if(task.name)        { this.tasks[index].name         = task.name; }
      if(task.layer)       { this.tasks[index].layer        = task.layer; }
      if(task.start)       { this.tasks[index].start        = task.start; }
      if(task.days)        { this.tasks[index].days         = task.days; }
      if(task.progress)    { this.tasks[index].progress     = task.progress; }
      if(task.dependencies){ this.tasks[index].dependencies = task.dependencies; }
      if(task.custom_class){ this.tasks[index].custom_class = task.custom_class; }
                       else{ this.tasks[index].custom_class = '' }
      if(task.sameline)    { this.tasks[index].sameline     = task.sameline; }
      if(id != task.name){
        for(let i=0; i<this.tasks.length; i++){
          if(this.tasks[i].dependencies){
            this.tasks[i].dependencies = this.changeDependencies(id, task.name, this.tasks[i].dependencies);
          }
        }
      }
      this.writeHistory('updateTask ' + id + ' > ' + task.name)
      this.drawGantt();
      this.config.onchange(this.tasks[index]);
    }
  }

  addTask(task, next=''){
    let new_task = {
      'id'          : '',
      'name'        : '作業' + Date.now().toString(),
      'layer'       : 1,
      'progress'    : 0,
      'dependencies': [],
      'start'       : dateFormat(new Date()),
      'days'        : 5,
      'close'       : 0,
      'custom_class': ''
    };
    if(task.name)        { new_task.name         = task.name; }
    if(task.layer)       { new_task.layer        = task.layer; }
    if(task.start)       { new_task.start        = task.start; }
    if(task.days)        { new_task.days         = task.days; }
    //if(task.progress)    { new_task.progress     = task.progress; }
    if(task.dependencies){ new_task.dependencies = task.dependencies; }
    if(task.custom_class){ new_task.custom_class = task.custom_class; }
                     else{ new_task.custom_class = '' }
    new_task.id = new_task.name;
    if(this.isEnableName(null, new_task.name) && this.isEnableDependencies(null, new_task.name, new_task.dependencies)){
      this.tasks.push(new_task);
      if(0 < next.length){
        let index = this.tasks.findIndex((t) => t.id === next);
        for(let i=this.tasks.length-1; (index+1)<i; i--){
          let tmp = this.tasks[i];
          this.tasks[i]   = this.tasks[i-1];
          this.tasks[i-1] = tmp;
        }
      }
      else{
        this.config.ypos = -1;
      }
      this.writeHistory('addTask ' + new_task.name)
      this.drawGantt();
      this.config.onchange(new_task);
    }
  }

  deleteTask(id){
    let index = this.tasks.findIndex((t) => t.id === id);
    if(0 <= index){
      for(let i=0; i<this.tasks.length; i++){
        if(this.tasks[i].dependencies){
          this.tasks[i].dependencies = this.changeDependencies(id, null, this.tasks[i].dependencies);
        }
      }
      this.tasks.splice(index, 1);
      this.writeHistory('deleteTask ' + id)
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
      if((new_name === this.tasks[i].id)
       ||(new_name === this.tasks[i].name)){
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

  changeDependencies(id, new_id, dependencies){
    try{
      for(let i=0; i<dependencies.length; i++){
        if(dependencies[i] === id){
          if(new_id){
             dependencies[i] = new_id;
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
        array = text.replace(' ', '').split(',');
      }
    }
    return array;
  }

  //------------------------
  // draw
  //------------------------
  drawGantt(range=this.config.range){
    for(let i=0; i<this.tasks.length; i++){
      this.tasks[i].id = this.tasks[i].name;
    }
    if(this.config.range != range){
      this.config.xpos = -1;
    }
    this.config.range = range;
    let gantt= document.getElementById(this.svg_id);
    let svg  = SVG.adopt(gantt);
    svg.clear();
    this.log = 1;
    this.close = 9;
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

  changeTaskClose(id){
    let task = this.tasks.find((t) => t.id === id);
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

  selectTask(id=''){
    let gantt= document.getElementById(this.tsk_id);
    let svg  = SVG.adopt(gantt);
    let s_id = 'gantt_label_select';
    let elem =  document.getElementById(s_id);
    if(elem){
      elem.remove();
      this.select = '';
    }
    if(0 < id.length){
       let next = document.getElementById('gantt_label_' + id);
       if(next){
         let box = next.getBBox();
         let step= this.task.h;
         let y   = box.y;
         let w   = this.head.ow-this.task.s;
         svg.rect(w, step).attr({x:0, y:y, id:s_id}).addClass('gantt-bar-task-select');
         this.select = id;
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
    this.h = this.head.h + this.task.h*tasks.length + this.task.sp + this.task.s;
  }

  getNameLength(svg, tasks){
    let max = 150;
    for(let i=0; i<tasks.length; i++){
      let id   = 'setConfig_damy';
      let name = this.getTaskText(tasks[i]) + '　';
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
    let text = svg.text('テスト').attr({x:0, y:30, id:id}).addClass('gantt-bar-label');
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
    //スクロールした際に隠れてしまうためbar、cal、tsk、cmdの順に追加する
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
    this.drawArrow(svg, this.tasks);
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
      this.drawCalendarText(svg, box, this.getMonthText(date) + '月', i++);
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
    svg.text(date.getFullYear() + '年' +  this.getMonthText(date) + '月').attr({x:x, y:y}).addClass('gantt-grid-label-top');
  }

  drawCalendarTopRough(svg, date, index){
    let x  = this.head.w*(index) + this.head.sp + this.head.l;
    let y  = this.head.f + this.head.sp + this.head.l;
    svg.text(date.getFullYear() + '年').attr({x:x, y:y}).addClass('gantt-grid-label-top');
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
      let day= dateCalsDays(new Date(this.p.s), new Date(events[i].date));
      let x  = (this.head.w*(day -1))/this.p.g + this.head.sp + this.head.l;
      let y  = this.head.f*3 + this.head.sp + this.head.l;
      svg.text('▲' + events[i].name).attr({x:x, y:y}).addClass('gantt-event');
    }
  }

  drawTask(svg, tasks){
    let step = this.task.h;
    for(let i=0,c=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        continue;
      }
      let x  = this.task.sp;
      let y  = step*(c+1) - this.task.sp - this.task.l*2;
      let w  = this.head.ow-this.task.s;
      let id = 'gantt_label_' + tasks[i].id;
      if(100 <= tasks[i].progress){
        svg.rect(w, step).attr({x:0, y:(step*c)}).addClass('gantt-bar-task-complete');
        svg.text(this.getTaskText(tasks[i])).attr({x:x, y:y, id:id, cursor:'pointer'}).addClass('gantt-bar-label-complete');
      }
      else{
        if(this.config.taskbg){
          svg.rect(w, step).attr({x:0, y:(step*c)}).addClass('gantt-bar-task' + tasks[i].custom_class);
        }
        svg.text(this.getTaskText(tasks[i])).attr({x:x, y:y, id:id, cursor:'pointer'}).addClass('gantt-bar-label');
      }
      let elem = document.getElementById(id);
      elem.addEventListener('mousedown', this.eventSelectTask);
      elem.addEventListener('dblclick',  this.eventDblClickTask);
      c++;
    }
  }

  isTaskHide(task){
    if(this.close < task.layer){
      return true;
    }
    else if(task.close){
      this.close = task.layer;
    }
    else{
      this.close = 9;
    }
    if(this.config.complete && (100<=task.progress)){
      return true;
    }
    return false;
  }

  getTaskText(task){
    let mark = (task.close) ? '＋ ' : '－ ';
    let text = this.getLayerSp(task.layer) + mark + task.name;
    return text;
  }

  getLayerSp(layer){
    let sp = '';
    for(let i=1; i < layer; i++){
      sp += '　';
    }
    return sp;
  }

  drawBar(svg, tasks){
    for(let i=0,c=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        if('on' === tasks[i].sameline){
          this.drawBarSub(svg, tasks[i], c-1);
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
    let id = task.id;
    let g  = svg.group().attr({transform:'translate(0,0)', id:id, cursor:'pointer'});
    g.rect(w, h).attr({x:x, y:y, id:'gantt_bar_' + task.id, rx:3, ry:3}).addClass('gantt-bar' + task.custom_class);
    g.rect(w*task.progress/100, h*2/3).attr({x:x, y:y+(h/3), id:'gantt_progress_' + task.id, rx:3, ry:3}).addClass('gantt-bar-progress' + task.custom_class);
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

  drawArrow(svg, tasks){
    for(let i=0; i<tasks.length; i++){
      if(this.isTaskHide(tasks[i])){
        continue;
      }
      if(tasks[i].dependencies){
        for(let j=0; j<tasks[i].dependencies.length; j++){
          let id   = 'gantt_arrow_' + tasks[i].dependencies[j] + '_' + tasks[i].id;
          let point= this.getPoint(tasks[i].id, tasks[i].dependencies[j]);
          let line = svg.polyline(point).attr({id:id}).addClass('gantt-arrow');
          line.marker('end', this.task.a, this.task.a, function(add){add.polygon([0,0, 0,4, 4,2]).addClass('gantt-arrow-end');});
        }
      }
    }
  }

  getPoint(task_id, dependencies_id){
    let st = document.getElementById('gantt_bar_' + dependencies_id);
    let ed = document.getElementById('gantt_bar_' + task_id);
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

  moveBars(id, mov, ongrid, complete=[]){
    if(this.isComplete(id, complete)){
      return;
    }
    complete.push(id);
    this.moveBar(id, mov, ongrid);
    for(let i=0; i<this.tasks.length; i++){
      for(let j=0; j<this.tasks[i].dependencies.length; j++){
        if(this.tasks[i].dependencies[j] === id){
          this.moveBars(this.tasks[i].id, mov, ongrid, complete);
          break;
        }
      }
    }
  }

  isComplete(id, complete){
    for(let i=0; i<complete.length; i++){
      if(complete[i] === id){
        return true;
      }
    }
    return false;
  }

  moveBar(id, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.id === id);
    let b    = document.getElementById('gantt_bar_' + id);
    let p    = document.getElementById('gantt_progress_' + id);
    let t    = document.getElementById('gantt_label_bar_' + id);
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
    this.moveArrow(id);
  }

  moveArrow(id){
    for(let i=0; i<this.tasks.length; i++){
      if(this.tasks[i].id === id){
        for(let j=0; j<this.tasks[i].dependencies.length; j++){
          let point= this.getPoint(this.tasks[i].id, this.tasks[i].dependencies[j]);
          if(0 < point.length){
            let id_a = 'gantt_arrow_' + this.tasks[i].dependencies[j] + '_' + this.tasks[i].id;
            let poly = document.getElementById(id_a);
            if(poly){
              poly.setAttribute('points', point);
            }
          }
        }
      }
    }
  }

  isNeedReview(){
    let start = new Date(this.p.s);
    let end   = new Date(this.p.e); 
    for(let i=0; i<this.tasks.length; i++){
      let ts  = new Date(this.tasks[i].start);
      let te  = dateAddDays(ts, this.tasks[i].days);
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

  addResizeItem(id){
    let elem = document.getElementById(id);
    let svg  = SVG.adopt(elem);
    let box  = elem.getBBox();
    let w    = 2;
    let h    = box.height;
    let lx   = box.x;
    let rx   = lx +box.width -w;
    let y    = box.y;
    svg.rect(w, h).attr({x:lx, y:y, id:'gantt_bar_left_' + id, cursor:'w-resize'}).addClass('gantt-bar-resize');
    svg.rect(w, h).attr({x:rx, y:y, id:'gantt_bar_right_' + id, cursor:'e-resize'}).addClass('gantt-bar-resize');
    let re    = document.getElementById('gantt_bar_right_' + id);
    let le    = document.getElementById('gantt_bar_left_' + id);
    re.addEventListener('mousedown',  this.eventRightDown);
    le.addEventListener('mousedown',  this.eventLeftDown);
  }

  removeResizeItem(id){
    document.getElementById('gantt_bar_left_' + id).remove();
    document.getElementById('gantt_bar_right_' + id).remove();
    MyGanttDraggableItem.edgeElem = null;
  }

  resizeBarRight(id, width, progress, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.id === id);
    let b    = document.getElementById('gantt_bar_' + id);
    let p    = document.getElementById('gantt_progress_' + id);
    let w    = width + mov;
    if(this.p.g/this.head.w < w){
      if(ongrid){
        let days = Math.round((b.width.baseVal.value)*this.p.g/this.head.w)
        w = (this.head.w*(days))/this.p.g;
        this.tasks[i].days = days;
      }
      b.width.baseVal.value = w;
      p.width.baseVal.value = (w*progress)/100;
      this.moveArrow(id);
    }
  }

  resizeBarLeft(id, basex, width, progress, mov, ongrid){
    let i    = this.tasks.findIndex((t) => t.id === id);
    let b    = document.getElementById('gantt_bar_' + id);
    let p    = document.getElementById('gantt_progress_' + id);
    let t    = document.getElementById('gantt_label_bar_' + id);
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
      this.moveArrow(id);
    }
  }

  //------------------------
  // event
  //------------------------
  eventSelectTask(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    let id   = e.target.parentNode.id.replace('gantt_label_', '');
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
    MyGanttDraggableItem.parent.config.onclick(task);
  }

  eventDblClickTask(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    let id   = e.target.parentNode.id.replace('gantt_label_', '');
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
    MyGanttDraggableItem.parent.changeTaskClose(id);
    MyGanttDraggableItem.parent.config.onchange(task);
  }

  eventMouseEnter(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    if((!MyGanttDraggableItem.dragElem) && (!MyGanttDraggableItem.rlenElem) && (!MyGanttDraggableItem.llenElem)){
      if(!MyGanttDraggableItem.edgeElem){
        MyGanttDraggableItem.edgeElem = e.target;
        MyGanttDraggableItem.parent.addResizeItem(MyGanttDraggableItem.edgeElem.id);
      }
    }
  }

  eventMouseLeave(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    if(MyGanttDraggableItem.edgeElem){
      MyGanttDraggableItem.parent.removeResizeItem(MyGanttDraggableItem.edgeElem.id);
    }
  }

  eventXScrollBarDown(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    MyGanttDraggableItem.xbarElem = e.target;
    let box  = MyGanttDraggableItem.xbarElem.getBBox();
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
  }

  eventYScrollBarDown(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    MyGanttDraggableItem.ybarElem = e.target;
    let box  = MyGanttDraggableItem.ybarElem.getBBox();
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
  }

  eventRightDown(e){
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    let id   = e.target.parentNode.id;
    let elem = document.getElementById(id);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + id);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
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
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    let id   = e.target.parentNode.id;
    let elem = document.getElementById(id);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + id);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
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
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    e.preventDefault();
    let id   = e.target.parentNode.id;
    let elem = document.getElementById(id);
    let box  = elem.getBBox();
    let b    = document.getElementById('gantt_bar_' + id);
    let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
    MyGanttDraggableItem.offsetX = e.clientX - box.x;
    MyGanttDraggableItem.offsetY = e.clientY - box.y;
    MyGanttDraggableItem.baseX   = b.getBBox().x;
    MyGanttDraggableItem.baseW   = b.getBBox().width;
    MyGanttDraggableItem.baseP   = task.progress;
    if((!MyGanttDraggableItem.rlenElem) && (!MyGanttDraggableItem.llenElem)){
      if(e.ctrlKey){
        let select = MyGanttDraggableItem.parent.tasks.find((t) => t.id === MyGanttDraggableItem.parent.select);
        if(select){
          let index = select.dependencies.findIndex((t) => t === id);
          if(0 <= index){
            select.dependencies.splice(index, 1);
          }
          else{
            select.dependencies.push(id);
          }
          MyGanttDraggableItem.parent.drawGantt();
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
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    if(MyGanttDraggableItem.rlenElem){
      e.preventDefault();
      let id   = MyGanttDraggableItem.rlenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + id);
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      MyGanttDraggableItem.parent.resizeBarRight(id, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x -b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
      MyGanttDraggableItem.parent.config.onchange(task);
      let scnt = dateCalsDays(new Date(MyGanttDraggableItem.parent.p.s), new Date(task.start));
      let ecnt = dateCalsDays(dateAddDays(new Date(task.start),task.days), new Date(MyGanttDraggableItem.parent.p.e));
      if((1>scnt) || (ecnt<2)){
        MyGanttDraggableItem.parent.drawGantt();
      }
    }
    else if(MyGanttDraggableItem.llenElem){
      e.preventDefault();
      let id   = MyGanttDraggableItem.llenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + id);
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      MyGanttDraggableItem.parent.resizeBarLeft(id, MyGanttDraggableItem.baseX, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x-b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
      MyGanttDraggableItem.parent.config.onchange(task);
      let scnt = dateCalsDays(new Date(MyGanttDraggableItem.parent.p.s), new Date(task.start));
      let ecnt = dateCalsDays(dateAddDays(new Date(task.start),task.days), new Date(MyGanttDraggableItem.parent.p.e));
      if((1>scnt) || (ecnt<2)){
        MyGanttDraggableItem.parent.drawGantt();
      }
    }
    else if(MyGanttDraggableItem.dragElem){
      let id   = MyGanttDraggableItem.dragElem.id;
      MyGanttDraggableItem.rlenElem = null;
      MyGanttDraggableItem.llenElem = null;
      MyGanttDraggableItem.dragElem = null;
      let b    = document.getElementById('gantt_bar_' + id);
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      MyGanttDraggableItem.parent.moveBars(id, x-b.x.baseVal.value, true);
      let task = MyGanttDraggableItem.parent.tasks.find((t) => t.id === id);
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
    //メモ：イベントリスナー内ではthisはaddEventListenerをしたオブジェクトになるっぽい
    if(MyGanttDraggableItem.rlenElem){
      e.preventDefault();
      let id   = MyGanttDraggableItem.rlenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + id);
      MyGanttDraggableItem.parent.resizeBarRight(id, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x -b.x.baseVal.value, false);
    }
    else if(MyGanttDraggableItem.llenElem){
      e.preventDefault();
      let id   = MyGanttDraggableItem.llenElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + id);
      MyGanttDraggableItem.parent.resizeBarLeft(id, MyGanttDraggableItem.baseX, MyGanttDraggableItem.baseW, MyGanttDraggableItem.baseP, x-b.x.baseVal.value, false);
    }
    else if(MyGanttDraggableItem.dragElem){
      e.preventDefault();
      let id   = MyGanttDraggableItem.dragElem.id;
      let x    = e.clientX - MyGanttDraggableItem.offsetX;
      let b    = document.getElementById('gantt_bar_' + id);
      MyGanttDraggableItem.parent.moveBars(id, x -b.x.baseVal.value, false);
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
