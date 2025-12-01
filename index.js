<script src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>

var swiper = new Swiper(".mySwiper" , {
   slidesPerView: 3,
   spaceBetween: 30,
   loop: true,
   loopFillGroupWithBlank:true,
   pagination : {
       el:".swiper-pagination" ,
       clickble:true,
   },
   navigation: {
       nextEl: ".swiper-button-next",
       prevEl: ".swiper-button-prev"
   },
   breakpoints: {
       0: {
           slidesPerView:1
       },
       520: {
           slidesPerView:2
       },
       950 : {
           slidesPerView:3
       } 
    }
}); 