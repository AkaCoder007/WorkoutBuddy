'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    constructor(distance, duration, coords) {
        this.distance = distance; //distance in km
        this.duration = duration; //duration in minutes
        this.coords = coords; // [latitude,longitude]
    }
    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this._description = `You went ${this.type[0].toUpperCase()}${this.type.slice(1)} on ${this.date.getDay()}  ${months[this.date.getMonth()]} ${this.date.getFullYear()}`;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    //min/km
    constructor(distance, duration, coords, elevationGain) {
        super(distance, duration, coords);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();

    }

    calcSpeed() {
        // km / hr
        this.speed = this.distance / (this.duration / 60);
    }
}

///////////////////////////////////
//Main application Architecture
class App {
    _map;
    _mapEvent;
    _workout;
    _workouts = [];
    _marker;
    constructor() {
        this._getPosition();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this))
        this._getLocalStorage.call(this);

    }


    _getPosition() {
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => alert('error in getting the position'))
    }

    _markerCreate(coords) {


        if (form.classList.contains('hidden')) {
            const Marker = L.marker(coords, {
                draggable: true,
                autopan: true,
            });
            Marker.addTo(this._map);
            return Marker;
        }
    }

    // Renders circular marker and binds popup to the marker of the given workout
    _circlePopupMarker(workout) {
        const Clayer = L.circle(workout.coords, {
            radius: 200,
            color: '#A545CC',
            opacity: 0.6
        });
        Clayer.addTo(this._map);
        this._marker.dragging.disable();
        // binding popup to marker
        this._marker.bindPopup(L.popup({
                closeOnClick: false,
                autoClose: false,
                className: `${workout.type}-popup`
            })).setPopupContent(`${workout.type=='running'?'🏃‍♂️':'🚴'} ${workout._description.slice(8)}`)
            .openPopup();
    }

    //  Loads map to the current location of the user
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];

        //........ Defining map
        this._map = L.map('map', {
            center: coords,
            zoom: 15.5
        });
        // console.log(this);
        // const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        // });


        const tiles = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });
        tiles.addTo(this._map);
        // creating and adding circular layer
        const Clayer = L.circle(coords, {
            radius: 300,
            color: '#A545CC',
            opacity: 0.6
        });
        Clayer.addTo(this._map);
        // marker on the curent location
        const marker = this._markerCreate(coords);
        // binding popup to marker
        marker.bindPopup(L.popup({
                closeOnClick: false,
                autoClose: false,
            })).setPopupContent(`You Are Here!`)
            .openPopup();
        marker.dragging.disable();
        if (this._workouts) {
            this._renderWorkoutArea.call(this);
        }
        // Event listener on clicks on the map
        this._map.on('click', this._showForm.bind(this));

    }
    _renderWorkoutArea() {
        this._workouts.forEach(workout => {
            this._marker = this._markerCreate(workout.coords);
            this._circlePopupMarker(workout);
        });

    }
    _showForm(mapE) {

        // creating and dispaying marker
        const { lat, lng } = mapE.latlng;
        const coords = [lat, lng];
        const markerChecker = this._markerCreate(coords, 'WORKOUT');
        if (markerChecker != undefined) {
            this._marker = markerChecker;
        }
        if (form.classList.contains('hidden')) {
            this._mapEvent = mapE;
            // console.log(this._mapEvent)
        }


        // updating maker event coordinates when dragged
        if (markerChecker != undefined) {

            markerChecker.on('dragend', function() {
                this._mapEvent = mapE;
                this._mapEvent.latlng = markerChecker.getLatLng();
            });
        }

        // showing form
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm() {
        form.classList.add('hidden');

    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        e.preventDefault();
        // Input validator helper function
        const validInputs = (...inputs) => inputs.every((x) => Number.isFinite(x) && x > 0);
        //Get data from the form

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        console.log(this._mapEvent.latlng);
        const { lat, lng } = this._mapEvent.latlng;
        const coords = [lat, lng];
        let workout;
        // Check if workout is running
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //check if the data is valid
            if (!validInputs(distance, duration, cadence)) {
                return alert('Inputs have to be a positve number!');
            }
            workout = new Running(distance, duration, coords, cadence);
        }

        //check if workout is cycling
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            // check if the data is valid
            if (!validInputs(elevation, duration, elevation)) {
                return alert('Inputs have to be a positve number!');
            }
            workout = new Cycling(distance, duration, coords, elevation);
        }
        //  Adding  workout object into the List 
        this._workouts.push(workout);
        console.log(this._workouts);
        this._circlePopupMarker(workout);


        //Render workout 
        this._renderWorkout(workout);
        // Clear the input field
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        //hideform
        this._hideForm();
        this._setLocalStorage.call(this);
    }





    _moveToWorkout(e) {
        const workoutElem = e.target.closest('.workout');
        if (!workoutElem) return;
        console.log(+workoutElem.dataset.id);

        const currentWorkout = this._workouts.find(workout => workout.id == workoutElem.dataset.id);
        console.log(currentWorkout);
        this._map.flyTo(currentWorkout.coords, 16, {
            duration: 1.75
        });
    }
    _renderWorkout(workout) {

        const elem = document.createElement('div');

        let html = ` <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout._description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type=='running'?'🏃‍♂️':'🚴'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>`;
        if (workout.type == 'running') {

            html = html + `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}
            </span>
                <span class="workout__unit">spm</span>
                </div>
            </li>`;
        }
        if (workout.type == 'cycling') {
            html = html + `
                <div class="workout__details">
                <span class="workout__icon">💨</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/hr</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">⛰️</span>
                <span class="workout__value">${workout.elevationGain}
            </span>
                <span class="workout__unit">metre</span>
                </div>
            </li>`;

        }
        elem.innerHTML = html;
        form.insertAdjacentElement('afterend', elem)


    }


    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this._workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;

        this._workouts = data;
        this._workouts.forEach(workout => this._renderWorkout(workout))
    }

    _resetWorkouts() {
        localStorage.removeItem('workouts');
        location.reload();;
    }
}

const app = new App();