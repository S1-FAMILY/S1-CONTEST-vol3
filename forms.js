(function(){var C=window.S1_CONFIG;if(!C||!C.forms)return;var F=C.forms;
document.querySelectorAll('a[href^="order.html"]').forEach(function(a){var h=a.getAttribute('href'),k=/n=solo/.test(h)?'solo':/n=duet/.test(h)?'duet':/n=crew/.test(h)?'crew':/#ticket/.test(h)?'ticket':/#master/.test(h)?'master':'';
if(k&&F[k]){a.href=F[k];a.target='_blank';a.rel='noopener'}})})();
