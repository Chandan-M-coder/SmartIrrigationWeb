function updateCrop() {

    const crop =
        document.getElementById("cropSelect").value;

    document.getElementById("currentCrop")
        .textContent = crop;

    alert(
        "Crop updated to " + crop
    );
}


function showDetails() {

    alert(
        "AI Prediction: Irrigation is required because soil moisture is low and rain is not detected."
    );

}
