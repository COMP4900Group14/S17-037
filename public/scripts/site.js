$("#menu-toggle").click(function (e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled");
});

$(".goo-collapsible > li > a").on("click", function (e) {
    //if submenu is hidden, does not have active class  
    if (!$(this).hasClass("active")) {
        // hide any open menus and remove active classes
        $(".goo-collapsible li ul").slideUp(350);
        $(".goo-collapsible li a").removeClass("active");
        // opens submenu and add the active class
        $(this).next("ul").slideDown(350);
        $(this).addClass("active");
        //if the submenu is visible    
    } else if ($(this).hasClass("active")) {
        //hide submenu and remove active class
        $(this).removeClass("active");
        $(this).next("ul").slideUp(350);
    }
});

$('#adminToggle').click(function () {
    $(this).find('i').toggleClass('glyphicon-folder-close').toggleClass('glyphicon-folder-open');
});

$('#productToggle').click(function () {
    $(this).find('i').toggleClass('glyphicon-folder-close').toggleClass('glyphicon-folder-open');
});

$('#navToggle').click(function () {
    $(this).find('i').toggleClass('glyphicon-menu-down').toggleClass('glyphicon-menu-up');
});

$('#menu-toggle').click(function () {
    $(this).find('i').toggleClass('glyphicon-menu-left').toggleClass('glyphicon-menu-right');
});


